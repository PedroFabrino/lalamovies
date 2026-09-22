import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { systemConfig, users } from '../db';
import { AppOptions } from '../appTypes';
import { runCorruptedArchiveRecovery } from '../services/unarchiveRecovery';
import { runHardlinkingRecovery } from '../services/hardlinkRecovery';

export function registerStartupHooks(app: FastifyInstance, options: AppOptions): void {
  app.addHook('onReady', async () => {
    const { jellyfin, db, unarchive, fileSystem, stateMachine, requestsRepo, qbittorrent } = app;

    if (jellyfin.ensureStreamLibrary) {
      try {
        const libraryId = await jellyfin.ensureStreamLibrary();
        if (libraryId) {
          const existing = db
            .select()
            .from(systemConfig)
            .where(eq(systemConfig.key, 'stream_library_id'))
            .get();
          if (existing) {
            db.update(systemConfig)
              .set({ value: libraryId })
              .where(eq(systemConfig.key, 'stream_library_id'))
              .run();
          } else {
            db.insert(systemConfig)
              .values({ key: 'stream_library_id', value: libraryId })
              .run();
          }
          app.log.info(`Stream library ensured in Jellyfin with ID ${libraryId}`);
        }
      } catch (err) {
        app.log.warn(`Could not ensure Stream library in Jellyfin on startup: ${(err as Error).message}`);
      }
    }

    if (jellyfin.discoverPrivateLibraryId) {
      try {
        const libraryId = await jellyfin.discoverPrivateLibraryId();
        if (libraryId) {
          const existing = db
            .select()
            .from(systemConfig)
            .where(eq(systemConfig.key, 'jellyfin_private_library_id'))
            .get();
          if (existing) {
            db.update(systemConfig)
              .set({ value: libraryId })
              .where(eq(systemConfig.key, 'jellyfin_private_library_id'))
              .run();
          } else {
            db.insert(systemConfig)
              .values({ key: 'jellyfin_private_library_id', value: libraryId })
              .run();
          }
          app.log.info(`Private library discovered in Jellyfin with ID ${libraryId}`);

          if (jellyfin.syncAllUserPermissions) {
            const allUsers = db
              .select({ jellyfinUserId: users.jellyfinUserId, role: users.role })
              .from(users)
              .all();
            await jellyfin.syncAllUserPermissions(
              allUsers as Array<{ jellyfinUserId: string | null; role: 'user' | 'trusted' | 'admin' }>
            );
            app.log.info(`Enforced private library access control for ${allUsers.length} users`);
          }
        } else {
          app.log.warn(
            'Private Library not found in Jellyfin — create a library pointing at /media/private to enable access control'
          );
        }
      } catch (err) {
        app.log.warn(`Could not discover Private library in Jellyfin on startup: ${(err as Error).message}`);
      }
    }

    if (options.startPoller) {
      setImmediate(() => {
        runCorruptedArchiveRecovery({
          db,
          unarchiveService: unarchive,
          fileSystem,
          jellyfin,
          stateMachine,
          logger: {
            info: (msg) => app.log.info(msg),
            warn: (msg) => app.log.warn(msg),
            error: (msg, err) => app.log.error(err, msg),
          },
        })
          .then((recoveryRes) => {
            if (recoveryRes.recoveredCount > 0) {
              app.log.info(
                `Startup corrupted archive recovery finished: recovered ${recoveryRes.recoveredCount} items`
              );
            }
          })
          .catch((recErr) => {
            app.log.warn(recErr, 'Non-fatal error in startup corrupted archive recovery');
          });

        runHardlinkingRecovery({
          db,
          fileSystem,
          requestsRepo,
          stateMachine,
          qbittorrentService: qbittorrent,
          logger: {
            info: (msg) => app.log.info(msg),
            warn: (msg) => app.log.warn(msg),
            error: (msg, err) => app.log.error(err, msg),
          },
        })
          .then((hlRes) => {
            if (hlRes.recoveredCount > 0 || hlRes.failedCount > 0) {
              app.log.info(
                `Startup hardlink recovery finished: recovered ${hlRes.recoveredCount}, failed ${hlRes.failedCount} items`
              );
            }
          })
          .catch((hlErr) => {
            app.log.warn(hlErr, 'Non-fatal error in startup hardlink recovery');
          });
      });
    }
  });
}
