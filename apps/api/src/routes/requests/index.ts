import { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { searchRoutes } from './search';
import { subtitlesRoutes } from './subtitles';
import { transcriptionRoutes } from './transcription';
import { createRoutes } from './create';
import { batchRoutes } from './batch';
import { listRoutes } from './list';
import { retryRoutes } from './retry';
import { promoteRoutes } from './promote';
import { lifecycleRoutes } from './lifecycle';

export * from './schemas';
export { searchRoutes } from './search';
export { subtitlesRoutes } from './subtitles';
export { transcriptionRoutes } from './transcription';
export { createRoutes } from './create';
export { batchRoutes } from './batch';
export { listRoutes } from './list';
export { retryRoutes } from './retry';
export { promoteRoutes } from './promote';
export { lifecycleRoutes } from './lifecycle';

export const requestRoutes: FastifyPluginAsync = async (app) => {
  // All /requests routes require authentication
  app.addHook('preHandler', authMiddleware);

  // Register decomposed sub-routers
  await app.register(searchRoutes);
  await app.register(subtitlesRoutes);
  await app.register(transcriptionRoutes);
  await app.register(createRoutes);
  await app.register(batchRoutes);
  await app.register(listRoutes);
  await app.register(retryRoutes);
  await app.register(promoteRoutes);
  await app.register(lifecycleRoutes);
};
