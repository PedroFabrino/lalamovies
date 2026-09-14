import { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { featureFlags } from '../db/schema';
import { AppDatabase } from '../db';

export function isFeatureEnabled(db: AppDatabase, flagId: string): boolean {
  try {
    const row = db
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId))
      .get();
    return row ? Boolean(row.enabled) : true;
  } catch {
    return true;
  }
}

export function requireFeature(flagId: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const enabled = isFeatureEnabled(request.server.db, flagId);
    if (!enabled) {
      return reply.status(503).send({
        error: 'FEATURE_DISABLED',
        code: 'FEATURE_DISABLED',
        message: `Feature '${flagId}' is temporarily disabled`,
      });
    }
  };
}
