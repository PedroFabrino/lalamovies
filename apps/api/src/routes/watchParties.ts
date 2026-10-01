import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { authMiddleware } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlags';
import { resolveDiscordWebhookUrl } from '../services/notifications';
import {
  buildWatchPartyStartPayload,
  buildWatchPartyProgressionPayload,
  buildWatchPartyEndedPayload,
  formatWatchPartyMediaTitle,
} from '../services/watchPartyNotifications';

const createWatchPartySchema = z.object({
  jellyfinItemId: z.string().min(1, 'jellyfinItemId is required'),
  title: z.string().min(1, 'title is required'),
  mediaType: z.string().min(1, 'mediaType is required'),
  metadataId: z.string().optional(),
  year: z.number().int().optional(),
  seasonNumber: z.number().int().optional(),
  episodeNumber: z.number().int().optional(),
  posterUrl: z.string().optional(),
  controlMode: z.enum(['everyone', 'host_only']).default('everyone'),
});

const switchMediaSchema = z.object({
  jellyfinItemId: z.string().min(1, 'jellyfinItemId is required'),
  title: z.string().min(1, 'title is required'),
  mediaType: z.string().min(1, 'mediaType is required'),
  metadataId: z.string().optional(),
  year: z.number().int().optional(),
  seasonNumber: z.number().int().optional(),
  episodeNumber: z.number().int().optional(),
  posterUrl: z.string().optional(),
});

export const watchPartyRoutes: FastifyPluginAsync = async (app) => {
  // Feature flag gating
  app.addHook('preHandler', requireFeature('watch_parties'));

  // GET /watch-parties - List all active watch parties
  app.get('/', async (_request, reply) => {
    const parties = app.watchPartyRepo.findActive();
    return reply.send({ watchParties: parties });
  });

  // GET /watch-parties/:id - Get party details
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const party = app.watchPartyRepo.findByIdWithHost(id);
    if (!party) {
      return reply.status(404).send({ error: 'Watch party not found' });
    }
    return reply.send({ watchParty: party });
  });

  // POST /watch-parties - Create and launch a new watch party
  app.post('/', { preHandler: [authMiddleware] }, async (request, reply) => {
    const parseResult = createWatchPartySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const body = parseResult.data;
    const currentUser = request.currentUser;
    if (!currentUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const displayTitle = formatWatchPartyMediaTitle(body);
    const groupName = `🎉 Watch Party: ${displayTitle}`;

    // 1. Provision Jellyfin SyncPlay group
    let jellyfinGroup: { groupId: string; groupName: string } = { groupId: crypto.randomUUID(), groupName };
    try {
      jellyfinGroup = await app.syncPlay.createSyncPlayGroup(groupName, body.jellyfinItemId);
    } catch (err) {
      request.log.warn(err, 'Failed to create Jellyfin SyncPlay group, using generated id');
    }

    // 2. Persist room in SQLite
    const roomId = crypto.randomUUID();
    const now = new Date().toISOString();

    const createdRoom = app.watchPartyRepo.create({
      id: roomId,
      hostUserId: currentUser.id,
      jellyfinGroupId: jellyfinGroup.groupId,
      jellyfinGroupName: jellyfinGroup.groupName,
      mediaType: body.mediaType,
      metadataId: body.metadataId ?? null,
      jellyfinItemId: body.jellyfinItemId,
      title: body.title,
      year: body.year ?? null,
      seasonNumber: body.seasonNumber ?? null,
      episodeNumber: body.episodeNumber ?? null,
      posterUrl: body.posterUrl ?? null,
      controlMode: body.controlMode,
      status: 'active',
      discordMessageId: null,
      discordChannelId: null,
      historyJson: JSON.stringify([]),
      createdAt: now,
      updatedAt: now,
      endedAt: null,
    });

    // 3. Dispatch Discord Announcement
    const webhookUrl = resolveDiscordWebhookUrl('watch_party');
    if (webhookUrl) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const discordPayload = buildWatchPartyStartPayload({
        roomId,
        hostUsername: currentUser.username,
        title: body.title,
        mediaType: body.mediaType,
        year: body.year,
        seasonNumber: body.seasonNumber,
        episodeNumber: body.episodeNumber,
        posterUrl: body.posterUrl,
        controlMode: body.controlMode,
        appBaseUrl: frontendUrl,
      });

      try {
        const discordRes = await fetch(`${webhookUrl}?wait=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload),
        });

        if (discordRes.ok) {
          const discordData = (await discordRes.json()) as { id?: string; channel_id?: string };
          if (discordData.id) {
            app.watchPartyRepo.update(roomId, {
              discordMessageId: discordData.id,
              discordChannelId: discordData.channel_id ?? null,
            });
            createdRoom.discordMessageId = discordData.id;
            createdRoom.discordChannelId = discordData.channel_id ?? null;
          }
        }
      } catch (err) {
        request.log.warn(err, 'Failed to dispatch Discord Watch Party announcement');
      }
    }

    // 4. Broadcast real-time WebSocket event
    if (typeof app.broadcast === 'function') {
      app.broadcast({
        type: 'watch_party_started',
        party: {
          ...createdRoom,
          hostUsername: currentUser.username,
        },
      });
    }

    return reply.status(201).send({
      watchParty: {
        ...createdRoom,
        hostUsername: currentUser.username,
      },
    });
  });

  // POST /watch-parties/:id/switch-media - Switch active media item
  app.post<{ Params: { id: string } }>('/:id/switch-media', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { id } = request.params;
    const parseResult = switchMediaSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const body = parseResult.data;
    const party = app.watchPartyRepo.findByIdWithHost(id);
    if (!party) {
      return reply.status(404).send({ error: 'Watch party not found' });
    }

    if (party.status !== 'active') {
      return reply.status(400).send({ error: 'Watch party is not active' });
    }

    if (party.hostUserId !== request.currentUser?.id) {
      return reply.status(403).send({ error: 'Only the party host can switch media' });
    }

    // 1. Accumulate history
    let history: Record<string, unknown>[] = [];
    try {
      history = JSON.parse(party.historyJson || '[]');
    } catch {
      history = [];
    }
    history.push({
      title: party.title,
      year: party.year,
      seasonNumber: party.seasonNumber,
      episodeNumber: party.episodeNumber,
      completedAt: new Date().toISOString(),
    });

    // 2. Update Jellyfin SyncPlay queue
    if (app.syncPlay.setSyncPlayItem) {
      await app.syncPlay.setSyncPlayItem(party.jellyfinGroupId, body.jellyfinItemId).catch(() => {});
    }

    // 3. Update room in DB
    app.watchPartyRepo.update(id, {
      jellyfinItemId: body.jellyfinItemId,
      title: body.title,
      mediaType: body.mediaType,
      metadataId: body.metadataId ?? null,
      year: body.year ?? null,
      seasonNumber: body.seasonNumber ?? null,
      episodeNumber: body.episodeNumber ?? null,
      posterUrl: body.posterUrl ?? null,
      historyJson: JSON.stringify(history),
    });

    // 4. Update Discord Party Timeline progression
    const webhookUrl = resolveDiscordWebhookUrl('watch_party');
    if (webhookUrl) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const progression = buildWatchPartyProgressionPayload({
        roomId: party.id,
        hostUsername: party.hostUsername,
        title: body.title,
        mediaType: body.mediaType,
        year: body.year,
        seasonNumber: body.seasonNumber,
        episodeNumber: body.episodeNumber,
        posterUrl: body.posterUrl,
        controlMode: party.controlMode as 'everyone' | 'host_only',
        appBaseUrl: frontendUrl,
        previousMedia: {
          title: party.title,
          year: party.year,
          seasonNumber: party.seasonNumber,
          episodeNumber: party.episodeNumber,
          completedAt: new Date().toISOString(),
        },
      });

      if (party.discordMessageId) {
        fetch(`${webhookUrl}/messages/${party.discordMessageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(progression.finishedCardUpdate),
        }).catch(() => {});
      }

      fetch(`${webhookUrl}?wait=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progression.nowPlayingCard),
      }).catch(() => {});
    }

    // 5. Broadcast real-time WebSocket event
    const updated = app.watchPartyRepo.findByIdWithHost(id)!;
    if (typeof app.broadcast === 'function') {
      app.broadcast({
        type: 'watch_party_media_switched',
        party: updated,
      });
    }

    return reply.send({ watchParty: updated });
  });

  // POST /watch-parties/:id/end - Host or admin ends the watch party
  app.post<{ Params: { id: string } }>('/:id/end', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { id } = request.params;
    const party = app.watchPartyRepo.findByIdWithHost(id);
    if (!party) {
      return reply.status(404).send({ error: 'Watch party not found' });
    }

    if (party.status === 'ended') {
      return reply.send({ ok: true, watchParty: party });
    }

    const isHost = party.hostUserId === request.currentUser?.id;
    const isAdmin = request.currentUser?.role === 'admin';
    if (!isHost && !isAdmin) {
      return reply.status(403).send({ error: 'Only the party host or an admin can end the watch party' });
    }

    const now = new Date().toISOString();
    app.watchPartyRepo.update(id, {
      status: 'ended',
      endedAt: now,
    });

    if (app.syncPlay.leaveSyncPlayGroup) {
      await app.syncPlay.leaveSyncPlayGroup(party.jellyfinGroupId).catch(() => {});
    }

    const webhookUrl = resolveDiscordWebhookUrl('watch_party');
    if (webhookUrl && party.discordMessageId) {
      let historyCount = 1;
      try {
        historyCount = 1 + (JSON.parse(party.historyJson || '[]') as unknown[]).length;
      } catch {
        historyCount = 1;
      }

      const endedPayload = buildWatchPartyEndedPayload({
        roomId: party.id,
        hostUsername: party.hostUsername,
        title: party.title,
        mediaType: party.mediaType,
        year: party.year,
        seasonNumber: party.seasonNumber,
        episodeNumber: party.episodeNumber,
        controlMode: party.controlMode as 'everyone' | 'host_only',
        historyCount,
      });

      fetch(`${webhookUrl}/messages/${party.discordMessageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endedPayload),
      }).catch(() => {});
    }

    if (typeof app.broadcast === 'function') {
      app.broadcast({
        type: 'watch_party_ended',
        partyId: id,
      });
    }

    const updated = app.watchPartyRepo.findByIdWithHost(id)!;
    return reply.send({ ok: true, watchParty: updated });
  });
};
