import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminPreferredIndexerCard from '../src/components/admin/AdminPreferredIndexerCard.vue';
import { usePreferredIndexerCookie } from '../src/composables/usePreferredIndexerCookie';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));

describe('AdminPreferredIndexerCard.vue & usePreferredIndexerCookie (Ticket #243)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePreferredIndexerCookie composable', () => {
    it('fetches preferred indexer cookie status successfully', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        configured: true,
        indexerName: 'BJ-Share',
        hasCookie: true,
        cookiePreview: '__cfbbid=123...890==',
        isExpired: false,
        status: 'ok',
        message: 'Cookie is active and valid.',
      });

      const composable = usePreferredIndexerCookie();
      await composable.fetchCookieStatus();

      expect(api.get).toHaveBeenCalledWith('/admin/preferred-indexer/cookie');
      expect(composable.cookieStatus.value?.status).toBe('ok');
      expect(composable.cookieStatus.value?.indexerName).toBe('BJ-Share');
      expect(composable.cookieStatus.value?.cookiePreview).toBe('__cfbbid=123...890==');
    });

    it('tests cookie override through API', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        ok: true,
        message: 'Cookie verified successfully for BJ-Share.',
      });

      const composable = usePreferredIndexerCookie();
      await composable.testCookie('test_cookie_string');

      expect(api.post).toHaveBeenCalledWith('/admin/preferred-indexer/cookie/test', {
        cookie: 'test_cookie_string',
      });
      expect(composable.feedbackMessage.value?.type).toBe('success');
      expect(composable.feedbackMessage.value?.text).toContain('verified successfully');
    });

    it('saves cookie and refreshes status', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        ok: true,
        message: 'Cookie updated and verified for BJ-Share.',
      });
      vi.mocked(api.get).mockResolvedValueOnce({
        configured: true,
        indexerName: 'BJ-Share',
        hasCookie: true,
        cookiePreview: 'new_preview',
        isExpired: false,
        status: 'ok',
      });

      const composable = usePreferredIndexerCookie();
      composable.cookieInput.value = 'new_cookie_content';
      await composable.saveCookie('new_cookie_content');

      expect(api.put).toHaveBeenCalledWith('/admin/preferred-indexer/cookie', {
        cookie: 'new_cookie_content',
      });
      expect(composable.feedbackMessage.value?.type).toBe('success');
      expect(composable.cookieInput.value).toBe('');
    });
  });

  describe('AdminPreferredIndexerCard component', () => {
    it('renders indexer name and healthy status badge on mount', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        configured: true,
        indexerName: 'BJ-Share',
        hasCookie: true,
        cookiePreview: '__cfbbid=3139324337...9nMBdgEA==',
        isExpired: false,
        status: 'ok',
        message: 'Cookie is active and valid.',
      });

      const wrapper = mount(AdminPreferredIndexerCard);
      await flushPromises();

      expect(wrapper.text()).toContain('Preferred Indexer (BJ-Share)');
      expect(wrapper.text()).toContain('Connected & Valid');
      expect(wrapper.text()).toContain('__cfbbid=3139324337...9nMBdgEA==');
    });

    it('renders expired status badge when status is expired', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        configured: true,
        indexerName: 'BJ-Share',
        hasCookie: true,
        cookiePreview: '__cfbbid=3139324337...9nMBdgEA==',
        isExpired: true,
        status: 'expired',
        message: 'Session cookie has expired or failed.',
      });

      const wrapper = mount(AdminPreferredIndexerCard);
      await flushPromises();

      expect(wrapper.text()).toContain('Cookie Expired / Failing');
      expect(wrapper.text()).toContain('Session cookie has expired or failed.');
    });
  });
});
