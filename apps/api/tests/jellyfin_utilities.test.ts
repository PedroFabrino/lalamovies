import { describe, it, expect, vi, afterEach } from 'vitest';
import { JellyfinService } from '../src/services/jellyfin';

describe('JellyfinService utilities', () => {
  // ── safeRefresh ────────────────────────────────────────────────────────────

  describe('safeRefresh', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('calls refreshLibrary and resolves on success', async () => {
      const service = new JellyfinService('http://localhost:8096', 'key');
      vi.spyOn(service, 'refreshLibrary').mockResolvedValue(undefined);

      await expect(service.safeRefresh()).resolves.toBeUndefined();
      expect(service.refreshLibrary).toHaveBeenCalledOnce();
    });

    it('swallows errors — does not throw when refreshLibrary rejects', async () => {
      const service = new JellyfinService('http://localhost:8096', 'key');
      vi.spyOn(service, 'refreshLibrary').mockRejectedValue(new Error('network down'));

      await expect(service.safeRefresh()).resolves.toBeUndefined();
    });

    it('swallows JellyfinApiError', async () => {
      const service = new JellyfinService('http://localhost:8096', 'key');
      const { JellyfinApiError } = await import('../src/services/jellyfin');
      vi.spyOn(service, 'refreshLibrary').mockRejectedValue(new JellyfinApiError('HTTP 500', 500));

      await expect(service.safeRefresh()).resolves.toBeUndefined();
    });
  });

  // ── getPublicJellyfinUrl ───────────────────────────────────────────────────

  describe('getPublicJellyfinUrl', () => {
    const service = new JellyfinService('http://localhost:8096', 'key');

    afterEach(() => {
      delete process.env.JELLYFIN_PUBLIC_URL;
      delete process.env.JELLYFIN_DOMAIN;
      delete process.env.JELLYFIN_URL;
    });

    it('returns JELLYFIN_PUBLIC_URL when set', () => {
      process.env.JELLYFIN_PUBLIC_URL = 'https://public.example.com';
      process.env.JELLYFIN_DOMAIN = 'domain.example.com';
      process.env.JELLYFIN_URL = 'http://internal:8096';

      expect(service.getPublicJellyfinUrl()).toBe('https://public.example.com');
    });

    it('falls back to https://JELLYFIN_DOMAIN when PUBLIC_URL absent', () => {
      process.env.JELLYFIN_DOMAIN = 'domain.example.com';
      process.env.JELLYFIN_URL = 'http://internal:8096';

      expect(service.getPublicJellyfinUrl()).toBe('https://domain.example.com');
    });

    it('falls back to JELLYFIN_URL when domain and public URL absent', () => {
      process.env.JELLYFIN_URL = 'http://internal:8096';

      expect(service.getPublicJellyfinUrl()).toBe('http://internal:8096');
    });

    it('returns undefined when no env vars are set', () => {
      expect(service.getPublicJellyfinUrl()).toBeUndefined();
    });

    it('JELLYFIN_PUBLIC_URL takes priority over domain', () => {
      process.env.JELLYFIN_PUBLIC_URL = 'https://public.example.com';
      process.env.JELLYFIN_DOMAIN = 'domain.example.com';

      expect(service.getPublicJellyfinUrl()).toBe('https://public.example.com');
    });

    it('JELLYFIN_DOMAIN takes priority over JELLYFIN_URL', () => {
      process.env.JELLYFIN_DOMAIN = 'domain.example.com';
      process.env.JELLYFIN_URL = 'http://internal:8096';

      expect(service.getPublicJellyfinUrl()).toBe('https://domain.example.com');
    });
  });
});
