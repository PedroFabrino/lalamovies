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
import { replaceTorrentRoutes } from './replaceTorrent';
import { lifecycleRoutes } from './lifecycle';
import { deletedRoutes } from './deleted';
import { redownloadRoutes } from './redownload';

export * from './schemas';
export { searchRoutes } from './search';
export { subtitlesRoutes } from './subtitles';
export { transcriptionRoutes } from './transcription';
export { createRoutes } from './create';
export { batchRoutes } from './batch';
export { listRoutes } from './list';
export { retryRoutes } from './retry';
export { promoteRoutes } from './promote';
export { replaceTorrentRoutes } from './replaceTorrent';
export { lifecycleRoutes } from './lifecycle';
export { deletedRoutes } from './deleted';
export { redownloadRoutes } from './redownload';

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
  await app.register(deletedRoutes);
  await app.register(redownloadRoutes);
  await app.register(retryRoutes);
  await app.register(promoteRoutes);
  await app.register(replaceTorrentRoutes);
  await app.register(lifecycleRoutes);
};
