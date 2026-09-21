import { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { searchRoutes } from './search';
import { subtitlesRoutes } from './subtitles';
import { transcriptionRoutes } from './transcription';
import { lifecycleRoutes } from './lifecycle';

export * from './schemas';
export { searchRoutes } from './search';
export { subtitlesRoutes } from './subtitles';
export { transcriptionRoutes } from './transcription';
export { lifecycleRoutes } from './lifecycle';

export const requestRoutes: FastifyPluginAsync = async (app) => {
  // All /requests routes require authentication
  app.addHook('preHandler', authMiddleware);

  // Register decomposed sub-routers
  await app.register(searchRoutes);
  await app.register(subtitlesRoutes);
  await app.register(transcriptionRoutes);
  await app.register(lifecycleRoutes);
};
