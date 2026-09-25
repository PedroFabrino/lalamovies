import { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { systemConfig } from '../../db/schema';

export const adminCleanupRoutes: FastifyPluginAsync = async (app) => {
  // POST /admin/cleanup — triggers CleanupService.checkDiskAndClean() immediately
  app.post('/cleanup', async (_request, reply) => {
    const scheduled = app.cleanup.checkDiskAndClean
      ? await app.cleanup.checkDiskAndClean()
      : [];
    return reply.send({ scheduled });
  });

  // POST /admin/cleanup/:requestId — triggers CleanupService.cleanItem(requestId) immediately
  app.post('/cleanup/:requestId', async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const item = app.requestsRepo.findById(requestId);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    await app.cleanup.cleanItem(requestId);
    return reply.send({ ok: true });
  });

  // GET /admin/cleanup/candidates — returns current Cleanup candidates in priority order (LRU first)
  app.get('/cleanup/candidates', async (_request, reply) => {
    const candidates = app.cleanup.getCandidates
      ? await app.cleanup.getCandidates()
      : [];
    return reply.send({ candidates });
  });

  // GET /admin/disk — returns disk usage, quota, and thresholds
  app.get('/disk', async (_request, reply) => {
    const percentFree = app.cleanup.getPercentFree ? app.cleanup.getPercentFree() : 100;
    const warnRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'disk_warn_threshold'))
      .get();
    const rejectRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'disk_reject_threshold'))
      .get();
    const quotaRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'storage_quota_gb'))
      .get();

    const storageQuotaGb = quotaRow ? parseInt(quotaRow.value, 10) : parseInt(process.env.STORAGE_QUOTA_GB || '150', 10);
    const storageQuotaBytes = storageQuotaGb * 1024 * 1024 * 1024;
    const footprintBytes = app.fileSystem.getStorageFootprintBytes ? await app.fileSystem.getStorageFootprintBytes() : 0;
    const storageFootprintGb = Number((footprintBytes / (1024 * 1024 * 1024)).toFixed(2));
    const quotaUsedPercent = storageQuotaGb > 0
      ? Math.min(100, Math.round((footprintBytes / storageQuotaBytes) * 1000) / 10)
      : 0;

    return reply.send({
      percentFree,
      percentUsed: Math.max(0, 100 - percentFree),
      warnThreshold: warnRow ? parseInt(warnRow.value, 10) : 20,
      rejectThreshold: rejectRow ? parseInt(rejectRow.value, 10) : 15,
      storageQuotaGb,
      storageQuotaBytes,
      storageFootprintBytes: footprintBytes,
      storageFootprintGb,
      quotaUsedPercent,
    });
  });
};
