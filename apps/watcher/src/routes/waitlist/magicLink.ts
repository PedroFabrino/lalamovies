import { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { watchRequests } from '../../db/schema';
import { verifyMagicLinkToken, deleteDiscordMessage } from '../../services/notifications';
import { renderStatusHtml } from './html';

export const waitlistMagicLinkRoutes: FastifyPluginAsync = async (app) => {
  // GET /waitlist/:id/reject?token=
  app.get('/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { token?: string };
    const token = query.token;

    const wantsHtml = Boolean(
      typeof request.headers.accept === 'string' &&
        request.headers.accept.includes('text/html') &&
        !request.headers.accept.includes('application/json')
    );

    if (!token) {
      if (wantsHtml) {
        return reply.status(401).type('text/html').send(renderStatusHtml({
          icon: '⚠️',
          title: 'Missing Rejection Token',
          subtitle: 'This rejection link is incomplete or invalid.',
        }));
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing rejection token',
      });
    }

    const secret = process.env.MAGIC_LINK_SECRET || 'magic-link-secret-default-change-me';
    const graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    const verification = verifyMagicLinkToken(token, id, secret, graceHours);

    if (!verification.valid) {
      if (wantsHtml) {
        return reply.status(401).type('text/html').send(renderStatusHtml({
          icon: '🚫',
          title: 'Invalid Rejection Link',
          subtitle: 'The signature on this rejection token is invalid or tampered.',
        }));
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or tampered rejection token',
      });
    }

    if (verification.expired) {
      if (wantsHtml) {
        return reply.status(410).type('text/html').send(renderStatusHtml({
          icon: '⏳',
          title: 'Rejection Period Expired',
          subtitle: `The ${graceHours}-hour rejection grace period has expired. Auto-download may have already triggered.`,
        }));
      }
      return reply.status(410).send({
        error: 'Gone',
        message: 'Rejection grace period has expired',
      });
    }

    const entry = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Waitlist entry not found',
      });
    }

    // Delete Discord message if it exists
    if (entry.discordMessageId) {
      await deleteDiscordMessage(
        entry.discordMessageId,
        process.env.WAITLIST_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL,
        {
          warn: (msg: string) => app.log.warn(msg),
        }
      );
    }

    const now = new Date().toISOString();
    app.db
      .update(watchRequests)
      .set({
        status: 'checking',
        failureCount: 0,
        notifyAt: null,
        prowlarrReleaseTitle: null,
        prowlarrReleaseMagnet: null,
        prowlarrReleaseScore: null,
        discordMessageId: null,
        updatedAt: now,
      })
      .where(eq(watchRequests.id, id))
      .run();

    const updated = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (wantsHtml) {
      return reply.type('text/html').send(renderStatusHtml({
        icon: '🗑️',
        title: 'Release Rejected',
        subtitle: `"${entry.title}" has been reset to checking trackers for a different release.`,
      }));
    }

    return reply.status(200).send({
      ok: true,
      message: 'Waitlist release rejected successfully. Entry reset to checking.',
      entry: updated,
      ...updated,
    });
  });

  // GET /waitlist/:id/approve?token=
  app.get('/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { token?: string };
    const token = query.token;
    const wantsHtml = Boolean(
      typeof request.headers.accept === 'string' &&
        request.headers.accept.includes('text/html') &&
        !request.headers.accept.includes('application/json')
    );

    if (!token) {
      if (wantsHtml) {
        return reply.status(401).type('text/html').send(renderStatusHtml({
          icon: '⚠️',
          title: 'Missing Approval Token',
          subtitle: 'This approval link is incomplete or invalid.',
        }));
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing approval token',
      });
    }

    const secret = process.env.MAGIC_LINK_SECRET || 'magic-link-secret-default-change-me';
    const graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    const verification = verifyMagicLinkToken(token, id, secret, graceHours);

    if (!verification.valid) {
      if (wantsHtml) {
        return reply.status(401).type('text/html').send(renderStatusHtml({
          icon: '🚫',
          title: 'Invalid Approval Link',
          subtitle: 'The signature on this approval token is invalid or tampered.',
        }));
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or tampered approval token',
      });
    }

    if (verification.expired) {
      if (wantsHtml) {
        return reply.status(410).type('text/html').send(renderStatusHtml({
          icon: '⏳',
          title: 'Approval Period Expired',
          subtitle: `The ${graceHours}-hour approval window for this release has passed. Auto-download may have already triggered.`,
        }));
      }
      return reply.status(410).send({
        error: 'Gone',
        message: 'Approval grace period has expired',
      });
    }

    const entry = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Waitlist entry not found',
      });
    }

    if (entry.status === 'triggered' || entry.status === 'completed') {
      if (wantsHtml) {
        return reply.type('text/html').send(renderStatusHtml({
          icon: '⚡',
          title: 'Already Downloading',
          subtitle: `"${entry.title}" is already being downloaded.`,
          releaseTitle: entry.prowlarrReleaseTitle,
        }));
      }
      return reply.send({
        ok: true,
        message: 'Release is already being downloaded',
        entry,
        ...entry,
      });
    }

    if (entry.status !== 'notified') {
      if (wantsHtml) {
        return reply.status(400).type('text/html').send(renderStatusHtml({
          icon: '⚠️',
          title: 'Cannot Approve',
          subtitle: `This entry is in "${entry.status}" state and cannot be approved.`,
        }));
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: `Cannot approve entry in '${entry.status}' status (must be 'notified')`,
      });
    }

    if (!entry.prowlarrReleaseMagnet) {
      if (wantsHtml) {
        return reply.status(400).type('text/html').send(renderStatusHtml({
          icon: '⚠️',
          title: 'No Release Available',
          subtitle: 'This entry has no magnet link associated with it.',
        }));
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Entry has no release magnet available to download',
      });
    }

    const submitResult = await app.submitter.submitEntry(entry);
    if (!submitResult.success) {
      if (wantsHtml) {
        return reply.status(500).type('text/html').send(renderStatusHtml({
          icon: '❌',
          title: 'Submission Failed',
          subtitle: submitResult.error || 'Failed to trigger download queue.',
        }));
      }
      return reply.status(500).send({
        error: 'Download Submission Failed',
        message: submitResult.error || 'Failed to submit download request to Main API',
      });
    }

    const updated = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (wantsHtml) {
      return reply.type('text/html').send(renderStatusHtml({
        icon: '✅',
        title: 'Download Approved!',
        subtitle: `Auto-download grace period bypassed. We have started downloading "${entry.title}".`,
        releaseTitle: entry.prowlarrReleaseTitle,
      }));
    }

    return reply.status(200).send({
      ok: true,
      message: 'Waitlist release approved successfully and sent to download queue.',
      entry: updated,
      ...updated,
    });
  });

  // POST /waitlist/:id/approve
  app.post('/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Waitlist entry not found',
      });
    }

    if (entry.status !== 'notified') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: `Cannot approve entry in '${entry.status}' status (must be 'notified')`,
      });
    }

    if (!entry.prowlarrReleaseMagnet) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Entry has no release magnet available to download',
      });
    }

    const submitResult = await app.submitter.submitEntry(entry);
    if (!submitResult.success) {
      return reply.status(500).send({
        error: 'Download Submission Failed',
        message: submitResult.error || 'Failed to submit download request to Main API',
      });
    }

    const updated = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    return reply.status(200).send({
      ok: true,
      message: 'Waitlist release approved successfully and sent to download queue.',
      entry: updated,
      ...updated,
    });
  });
};
