import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { downloadRequests, featureFlags, systemConfig, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import {
  TranscriptionCron,
  getLocalTimeInTimezone,
  isInsideWindow,
} from '../src/jobs/transcriptionCron';

describe('Timezone-Aware Transcription Window Scheduler (Subtask #102)', () => {
  let app: FastifyInstance;
  const mockTriggerBatch = vi.fn();
  const mockBroadcast = vi.fn();

  beforeEach(async () => {
    mockTriggerBatch.mockClear();
    mockBroadcast.mockClear();

    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
    });
    await app.ready();
    vi.spyOn(app, 'broadcast').mockImplementation(mockBroadcast);

    app.db.insert(users).values({
      id: 'usr_cron_test',
      username: 'cron_tester',
      jellyfinUserId: 'jf_cron',
      role: 'admin',
      createdAt: new Date().toISOString(),
    }).run();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Timezone & Window Pure Functions', () => {
    it('evaluates local time across different timezones correctly', () => {
      // 2026-09-16T12:00:00Z -> UTC is 12:00, Sao Paulo is 09:00 (UTC-3), Tokyo is 21:00 (UTC+9)
      const fixedDate = new Date('2026-09-16T12:00:00.000Z');

      const utc = getLocalTimeInTimezone(fixedDate, 'UTC');
      expect(utc).toEqual({ hour: 12, minute: 0 });

      const sp = getLocalTimeInTimezone(fixedDate, 'America/Sao_Paulo');
      expect(sp).toEqual({ hour: 9, minute: 0 });

      const tokyo = getLocalTimeInTimezone(fixedDate, 'Asia/Tokyo');
      expect(tokyo).toEqual({ hour: 21, minute: 0 });
    });

    it('correctly handles standard same-day window (02:00 to 07:00)', () => {
      expect(isInsideWindow({ hour: 1, minute: 59 }, '02:00', '07:00')).toBe(false);
      expect(isInsideWindow({ hour: 2, minute: 0 }, '02:00', '07:00')).toBe(true);
      expect(isInsideWindow({ hour: 5, minute: 30 }, '02:00', '07:00')).toBe(true);
      expect(isInsideWindow({ hour: 6, minute: 59 }, '02:00', '07:00')).toBe(true);
      expect(isInsideWindow({ hour: 7, minute: 0 }, '02:00', '07:00')).toBe(false);
    });

    it('correctly handles overnight midnight-crossing window (23:00 to 05:00)', () => {
      expect(isInsideWindow({ hour: 22, minute: 59 }, '23:00', '05:00')).toBe(false);
      expect(isInsideWindow({ hour: 23, minute: 0 }, '23:00', '05:00')).toBe(true);
      expect(isInsideWindow({ hour: 1, minute: 15 }, '23:00', '05:00')).toBe(true);
      expect(isInsideWindow({ hour: 4, minute: 59 }, '23:00', '05:00')).toBe(true);
      expect(isInsideWindow({ hour: 5, minute: 0 }, '23:00', '05:00')).toBe(false);
      expect(isInsideWindow({ hour: 12, minute: 0 }, '23:00', '05:00')).toBe(false);
    });
  });

  describe('TranscriptionCron Execution Lifecycle', () => {
    it('remains dormant and does not dispatch when outside the transcription window', async () => {
      // Configure window: 02:00 to 07:00 America/Sao_Paulo
      app.db.update(systemConfig).set({ value: '02:00' }).where(eq(systemConfig.key, 'transcription_window_start')).run();
      app.db.update(systemConfig).set({ value: '07:00' }).where(eq(systemConfig.key, 'transcription_window_end')).run();
      app.db.update(systemConfig).set({ value: 'America/Sao_Paulo' }).where(eq(systemConfig.key, 'transcription_timezone')).run();

      app.db.insert(downloadRequests).values({
        id: 'req_pending_1',
        userId: 'usr_cron_test',
        magnetLink: 'magnet:?xt=urn:btih:dormant1',
        mediaType: 'private',
        status: 'seeding',
        metadataId: 'm_1',
        metadataSource: 'tmdb',
        title: 'Pending Movie',
        jellyfinPath: '/media/private/Movie/Movie.mkv',
        transcriptionStatus: 'pending',
        requestedAt: new Date().toISOString(),
      }).run();

      // Current time is 15:00 in America/Sao_Paulo (18:00 UTC) -> OUTSIDE window
      const mockNow = new Date('2026-09-16T18:00:00.000Z');

      const cronJob = new TranscriptionCron({
        db: app.db,
        subgen: { triggerBatch: mockTriggerBatch },
        nowProvider: () => mockNow,
      });

      await cronJob.runOnce();

      expect(mockTriggerBatch).not.toHaveBeenCalled();
      const item = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_pending_1')).get();
      expect(item?.transcriptionStatus).toBe('pending');
    });

    it('halts and does not dispatch when transcription_enabled feature flag is toggled off', async () => {
      // Set inside window: 02:00 to 07:00, mock time is 03:00
      app.db.update(systemConfig).set({ value: '02:00' }).where(eq(systemConfig.key, 'transcription_window_start')).run();
      app.db.update(systemConfig).set({ value: '07:00' }).where(eq(systemConfig.key, 'transcription_window_end')).run();
      app.db.update(systemConfig).set({ value: 'UTC' }).where(eq(systemConfig.key, 'transcription_timezone')).run();

      app.db.update(featureFlags).set({ enabled: false }).where(eq(featureFlags.id, 'transcription_enabled')).run();

      app.db.insert(downloadRequests).values({
        id: 'req_flag_off',
        userId: 'usr_cron_test',
        magnetLink: 'magnet:?xt=urn:btih:flagoff',
        mediaType: 'private',
        status: 'seeding',
        metadataId: 'm_2',
        metadataSource: 'tmdb',
        title: 'Flag Off Movie',
        jellyfinPath: '/media/private/Movie/Movie.mkv',
        transcriptionStatus: 'pending',
        requestedAt: new Date().toISOString(),
      }).run();

      const mockNow = new Date('2026-09-16T03:00:00.000Z'); // Inside UTC window

      const cronJob = new TranscriptionCron({
        db: app.db,
        subgen: { triggerBatch: mockTriggerBatch },
        isTranscriptionEnabled: () => {
          const row = app.db.select().from(featureFlags).where(eq(featureFlags.id, 'transcription_enabled')).get();
          return Boolean(row?.enabled);
        },
        nowProvider: () => mockNow,
      });

      await cronJob.runOnce();

      expect(mockTriggerBatch).not.toHaveBeenCalled();
      const item = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_flag_off')).get();
      expect(item?.transcriptionStatus).toBe('pending');
    });

    it('enforces single concurrency and skips dispatch when another item is currently transcribing', async () => {
      app.db.update(systemConfig).set({ value: '00:00' }).where(eq(systemConfig.key, 'transcription_window_start')).run();
      app.db.update(systemConfig).set({ value: '23:59' }).where(eq(systemConfig.key, 'transcription_window_end')).run();
      app.db.update(systemConfig).set({ value: 'UTC' }).where(eq(systemConfig.key, 'transcription_timezone')).run();

      // Active job
      app.db.insert(downloadRequests).values({
        id: 'req_already_running',
        userId: 'usr_cron_test',
        magnetLink: 'magnet:?xt=urn:btih:running',
        mediaType: 'private',
        status: 'seeding',
        metadataId: 'm_3',
        metadataSource: 'tmdb',
        title: 'Running Movie',
        jellyfinPath: '/media/private/Running/Running.mkv',
        transcriptionStatus: 'transcribing',
        requestedAt: '2026-09-16T01:00:00.000Z',
      }).run();

      // Queued job waiting
      app.db.insert(downloadRequests).values({
        id: 'req_waiting',
        userId: 'usr_cron_test',
        magnetLink: 'magnet:?xt=urn:btih:waiting',
        mediaType: 'private',
        status: 'seeding',
        metadataId: 'm_4',
        metadataSource: 'tmdb',
        title: 'Waiting Movie',
        jellyfinPath: '/media/private/Waiting/Waiting.mkv',
        transcriptionStatus: 'pending',
        requestedAt: '2026-09-16T02:00:00.000Z',
      }).run();

      const cronJob = new TranscriptionCron({
        db: app.db,
        subgen: { triggerBatch: mockTriggerBatch },
        nowProvider: () => new Date('2026-09-16T10:00:00.000Z'),
      });

      await cronJob.runOnce();

      expect(mockTriggerBatch).not.toHaveBeenCalled();
      const waiting = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_waiting')).get();
      expect(waiting?.transcriptionStatus).toBe('pending');
    });

    it('dispatches oldest pending private request during active window and transitions status', async () => {
      app.db.update(systemConfig).set({ value: '02:00' }).where(eq(systemConfig.key, 'transcription_window_start')).run();
      app.db.update(systemConfig).set({ value: '07:00' }).where(eq(systemConfig.key, 'transcription_window_end')).run();
      app.db.update(systemConfig).set({ value: 'UTC' }).where(eq(systemConfig.key, 'transcription_timezone')).run();

      // Older pending item
      app.db.insert(downloadRequests).values({
        id: 'req_first_pending',
        userId: 'usr_cron_test',
        magnetLink: 'magnet:?xt=urn:btih:firstpending',
        mediaType: 'private',
        status: 'seeding',
        metadataId: 'm_5',
        metadataSource: 'tmdb',
        title: 'Oldest Movie',
        jellyfinPath: '/media/private/Oldest (2020)/Oldest (2020).mkv',
        transcriptionStatus: 'pending',
        requestedAt: '2026-09-16T01:00:00.000Z',
      }).run();

      // Newer pending item
      app.db.insert(downloadRequests).values({
        id: 'req_second_pending',
        userId: 'usr_cron_test',
        magnetLink: 'magnet:?xt=urn:btih:secondpending',
        mediaType: 'private',
        status: 'seeding',
        metadataId: 'm_6',
        metadataSource: 'tmdb',
        title: 'Newer Movie',
        jellyfinPath: '/media/private/Newer (2024)/Newer (2024).mkv',
        transcriptionStatus: 'pending',
        requestedAt: '2026-09-16T02:00:00.000Z',
      }).run();

      const mockNow = new Date('2026-09-16T03:30:00.000Z'); // 03:30 UTC -> inside window

      const cronJob = new TranscriptionCron({
        db: app.db,
        subgen: { triggerBatch: mockTriggerBatch },
        nowProvider: () => mockNow,
        broadcast: mockBroadcast,
      });

      await cronJob.runOnce();

      expect(mockTriggerBatch).toHaveBeenCalledWith('/media/private/Oldest (2020)/Oldest (2020).mkv');

      const first = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_first_pending')).get();
      expect(first?.transcriptionStatus).toBe('transcribing');

      const second = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_second_pending')).get();
      expect(second?.transcriptionStatus).toBe('pending');
    });

    it('marks request as failed with diagnostic message when subgen dispatch throws', async () => {
      app.db.update(systemConfig).set({ value: '00:00' }).where(eq(systemConfig.key, 'transcription_window_start')).run();
      app.db.update(systemConfig).set({ value: '23:59' }).where(eq(systemConfig.key, 'transcription_window_end')).run();
      app.db.update(systemConfig).set({ value: 'UTC' }).where(eq(systemConfig.key, 'transcription_timezone')).run();

      app.db.insert(downloadRequests).values({
        id: 'req_err_dispatch',
        userId: 'usr_cron_test',
        magnetLink: 'magnet:?xt=urn:btih:errdispatch',
        mediaType: 'private',
        status: 'seeding',
        metadataId: 'm_7',
        metadataSource: 'tmdb',
        title: 'Error Movie',
        jellyfinPath: '/media/private/Error/Error.mkv',
        transcriptionStatus: 'pending',
        requestedAt: '2026-09-16T01:00:00.000Z',
      }).run();

      const failingSubgen = {
        triggerBatch: vi.fn().mockRejectedValue(new Error('Subgen container unavailable: ECONNREFUSED')),
      };

      const cronJob = new TranscriptionCron({
        db: app.db,
        subgen: failingSubgen,
        nowProvider: () => new Date('2026-09-16T04:00:00.000Z'),
        broadcast: mockBroadcast,
      });

      await cronJob.runOnce();

      const updated = app.db.select().from(downloadRequests).where(eq(downloadRequests.id, 'req_err_dispatch')).get();
      expect(updated?.transcriptionStatus).toBe('failed');
      expect(updated?.transcriptionError).toBe('Subgen container unavailable: ECONNREFUSED');
    });
  });
});
