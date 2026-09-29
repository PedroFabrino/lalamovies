import { FastifyPluginAsync } from 'fastify';
import { and, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { watchRequests, WatchRequest, waitlistCoRequesters } from '../../db/schema';
import { evaluateInitialStatus } from '../../services/releaseGating';
import { computeGraceHours } from '../../utils/gracePeriod';
import { CreateWaitlistBody, normalizeTitle } from './types';

export const waitlistCreateRoutes: FastifyPluginAsync = async (app) => {
  // POST /waitlist - create or join waitlist entry
  app.post('/', async (request, reply) => {
    const body = request.body as CreateWaitlistBody | undefined;
    if (!body) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Request body is required',
      });
    }

    const headerUserId = request.headers['x-user-id'] as string | undefined;
    const userId = headerUserId || body.userId;

    if (!userId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'userId is required',
      });
    }

    if (!body.mediaType || !['movie', 'tv_show', 'anime'].includes(body.mediaType)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valid mediaType (movie, tv_show, anime) is required',
      });
    }

    if (!body.metadataId || !body.metadataSource || !body.title) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'metadataId, metadataSource, and title are required',
      });
    }

    if (body.metadataSource !== 'tmdb') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: "metadataSource must be 'tmdb'",
      });
    }

    const effectiveSeason = body.seasonNumber ?? (body.mediaType === 'movie' ? null : 1);
    const effectiveTargetEpisode = body.mediaType === 'movie'
      ? null
      : (body.targetEpisode !== undefined ? body.targetEpisode : (body.isNextSeason ? null : 1));

    // Guard 3: Cross-user duplicate active waitlist check with asymmetry and title normalization
    const isBodySeries = body.mediaType === 'tv_show' || body.mediaType === 'anime';
    const activeEntries = app.db
      .select()
      .from(watchRequests)
      .where(
        inArray(watchRequests.status, ['pending_release', 'checking', 'notified', 'triggered'])
      )
      .all();

    const normBodyTitle = body.title ? normalizeTitle(body.title) : '';

    const candidateEntries = activeEntries.filter((e) => {
      const isEntrySeries = e.mediaType === 'tv_show' || e.mediaType === 'anime';
      if (isBodySeries !== isEntrySeries) {
        return false;
      }

      if (e.metadataId && e.metadataId === body.metadataId) {
        return true;
      }
      if (normBodyTitle && e.title && normalizeTitle(e.title) === normBodyTitle) {
        return true;
      }
      return false;
    });

    let matchingEntry: WatchRequest | undefined;

    if (body.mediaType === 'movie') {
      matchingEntry = candidateEntries[0];
    } else {
      const isSeasonPack = effectiveTargetEpisode === null || effectiveTargetEpisode === undefined;
      const isSingleEpisode = !isSeasonPack;

      if (isSingleEpisode) {
        // 1. Season pack covers episode (asymmetry)
        const pack = candidateEntries.find(
          (e) => (e.seasonNumber ?? 1) === effectiveSeason && (e.targetEpisode === null || e.targetEpisode === undefined)
        );
        if (pack) {
          matchingEntry = pack;
        } else {
          // 2. Exact episode match
          const exactEp = candidateEntries.find(
            (e) => (e.seasonNumber ?? 1) === effectiveSeason && e.targetEpisode === effectiveTargetEpisode
          );
          if (exactEp) {
            matchingEntry = exactEp;
          } else {
            // 3. For the SAME user, an active entry for this season prevents duplicate
            matchingEntry = candidateEntries.find(
              (e) => e.userId === userId && (e.seasonNumber ?? 1) === effectiveSeason
            );
          }
        }
      } else {
        // 1. Exact season pack match (applies cross-user)
        const pack = candidateEntries.find(
          (e) => (e.seasonNumber ?? 1) === effectiveSeason && (e.targetEpisode === null || e.targetEpisode === undefined)
        );
        if (pack) {
          matchingEntry = pack;
        } else {
          // 2. For the SAME user, an active entry for this season prevents duplicate
          matchingEntry = candidateEntries.find(
            (e) => e.userId === userId && (e.seasonNumber ?? 1) === effectiveSeason
          );
        }
      }
    }

    if (matchingEntry) {
      const now = new Date().toISOString();
      if (matchingEntry.userId !== userId) {
        // Add submitting user to waitlist_co_requesters if not already present
        const existingCoReq = app.db
          .select()
          .from(waitlistCoRequesters)
          .where(
            and(
              eq(waitlistCoRequesters.waitlistId, matchingEntry.id),
              eq(waitlistCoRequesters.userId, userId)
            )
          )
          .get();

        if (!existingCoReq) {
          app.db
            .insert(waitlistCoRequesters)
            .values({
              waitlistId: matchingEntry.id,
              userId,
              addedAt: now,
            })
            .run();
        }
      }

      const coReqs = app.db
        .select({ userId: waitlistCoRequesters.userId })
        .from(waitlistCoRequesters)
        .where(eq(waitlistCoRequesters.waitlistId, matchingEntry.id))
        .all();
      const coRequesterCount = coReqs.length;

      return reply.status(200).send({
        entry: { ...matchingEntry, coRequesterCount },
        ...matchingEntry,
        coRequesterCount,
      });
    }

    const now = new Date().toISOString();
    let initialStatus: WatchRequest['status'] = body.status || 'checking';
    let tmdbReleaseDate: string | null = null;

    if (!body.status && app.releaseGating) {
      try {
        const fetchedDate = body.tmdbReleaseDate !== undefined
          ? body.tmdbReleaseDate
          : await app.releaseGating.fetchReleaseDate(
              body.mediaType,
              body.metadataId,
              body.seasonNumber,
              effectiveTargetEpisode,
              body.metadataSource
            );
        const evaluated = evaluateInitialStatus(fetchedDate, undefined, Boolean(body.isNextSeason));
        initialStatus = evaluated.status;
        tmdbReleaseDate = evaluated.tmdbReleaseDate;
      } catch (err) {
        app.log.warn(err, 'Failed to fetch release date from metadata API, defaulting to pending_release');
        initialStatus = 'pending_release';
        tmdbReleaseDate = null;
      }
    }

    const notifyBeforeDownload = body.notifyBeforeDownload ?? false;
    let graceOverrideHours: number;

    if (!notifyBeforeDownload) {
      graceOverrideHours = 0;
    } else {
      const movieGraceHours = app.movieGraceHours ?? (process.env.MOVIE_GRACE_HOURS !== undefined ? Number(process.env.MOVIE_GRACE_HOURS) : 6);
      const episodeGraceHours = app.episodeGraceHours ?? (process.env.EPISODE_GRACE_HOURS !== undefined ? Number(process.env.EPISODE_GRACE_HOURS) : 0);
      const thresholdDays = app.newReleaseThresholdDays ?? (process.env.NEW_RELEASE_THRESHOLD_DAYS !== undefined ? Number(process.env.NEW_RELEASE_THRESHOLD_DAYS) : 30);

      graceOverrideHours = computeGraceHours(body.mediaType, tmdbReleaseDate, {
        movieGraceHours,
        episodeGraceHours,
        thresholdDays,
      });
    }

    const newEntry: WatchRequest = {
      id: randomUUID(),
      userId,
      mediaType: body.mediaType,
      metadataId: body.metadataId,
      metadataSource: body.metadataSource,
      title: body.title,
      year: body.year ?? null,
      seasonNumber: effectiveSeason,
      targetEpisode: effectiveTargetEpisode,
      triggeredCount: 0,
      failureCount: 0,
      status: initialStatus,
      tmdbReleaseDate,
      prowlarrReleaseTitle: null,
      prowlarrReleaseMagnet: null,
      prowlarrReleaseScore: null,
      discordMessageId: null,
      notifyAt: null,
      posterUrl: body.posterUrl ?? null,
      requesterUsername: body.requesterUsername ?? null,
      requesterEmail: body.requesterEmail ?? null,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      cancelledBy: null,
      graceOverrideHours,
      lastCheckResult: null,
    };

    app.db.insert(watchRequests).values(newEntry).run();

    return reply.status(201).send({
      entry: { ...newEntry, coRequesterCount: 0 },
      ...newEntry,
      coRequesterCount: 0,
    });
  });
};
