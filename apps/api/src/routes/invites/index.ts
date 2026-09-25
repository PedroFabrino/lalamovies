import { FastifyPluginAsync } from 'fastify';
import { inviteAcceptRoutes } from './accept';
import { inviteManageRoutes } from './manage';
import { inviteAdminRoutes } from './admin';

export const inviteRoutes: FastifyPluginAsync = async (app) => {
  await app.register(inviteAcceptRoutes);
  await app.register(inviteManageRoutes);
  await app.register(inviteAdminRoutes);
};
