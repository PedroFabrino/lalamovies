import { FastifyPluginAsync } from 'fastify';
import { users } from '../../db/schema';

export const adminJellyfinRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/jellyfin/status — check Jellyfin connection and authentication health
  app.get('/jellyfin/status', async (_request, reply) => {
    if (app.jellyfin.checkStatus) {
      const status = await app.jellyfin.checkStatus();
      return reply.send(status);
    }
    return reply.send({ reachable: true, authenticated: true });
  });

  // POST /admin/jellyfin/rescan — triggers manual Jellyfin library refresh
  app.post('/jellyfin/rescan', async (_request, reply) => {
    try {
      if (app.jellyfin.refreshLibrary) {
        await app.jellyfin.refreshLibrary();
      }
      if (app.jellyfin.syncAllUserPermissions) {
        const allUsers = app.db
          .select({ jellyfinUserId: users.jellyfinUserId, role: users.role })
          .from(users)
          .all();
        await app.jellyfin.syncAllUserPermissions(
          allUsers as Array<{ jellyfinUserId: string | null; role: 'user' | 'trusted' | 'admin' }>
        );
      }
      return reply.send({ success: true, message: 'Jellyfin library refresh triggered successfully' });
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to refresh Jellyfin library';
      return reply.status(502).send({
        error: 'Bad Gateway',
        message: msg,
      });
    }
  });
};
