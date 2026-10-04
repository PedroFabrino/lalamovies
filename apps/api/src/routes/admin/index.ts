import { FastifyPluginAsync } from 'fastify';
import { authMiddleware, adminGuard } from '../../middleware/auth';
import { adminUsersRoutes } from './users';
import { adminConfigRoutes } from './config';
import { adminCleanupRoutes } from './cleanup';
import { adminFeaturesRoutes } from './features';
import { adminJellyfinRoutes } from './jellyfin';
import { adminActivityRoutes } from './activity';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // All /admin routes require authentication and admin role
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', adminGuard);

  await app.register(adminUsersRoutes);
  await app.register(adminConfigRoutes);
  await app.register(adminCleanupRoutes);
  await app.register(adminFeaturesRoutes);
  await app.register(adminJellyfinRoutes);
  await app.register(adminActivityRoutes);
};
