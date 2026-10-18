import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PreferredIndexerAlertBanner from '../src/components/PreferredIndexerAlertBanner.vue';
import { useAuthStore } from '../src/stores/auth';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('PreferredIndexerAlertBanner.vue (Ticket #244)', () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  it('does not render banner for non-admin users even if cookie is expired', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'u1', username: 'regular', role: 'user' } as any;

    const wrapper = mount(PreferredIndexerAlertBanner, {
      global: {
        stubs: {
          'router-link': true,
        },
      },
    });

    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('does not render banner for admin when cookie status is ok', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'a1', username: 'admin', role: 'admin' } as any;

    vi.mocked(api.get).mockResolvedValueOnce({
      configured: true,
      indexerName: 'BJ-Share',
      status: 'ok',
      isExpired: false,
    });

    const wrapper = mount(PreferredIndexerAlertBanner, {
      global: {
        stubs: {
          'router-link': true,
        },
      },
    });

    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('renders alert banner for admin when cookie is expired', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'a1', username: 'admin', role: 'admin' } as any;

    vi.mocked(api.get).mockResolvedValueOnce({
      configured: true,
      indexerName: 'BJ-Share',
      status: 'expired',
      isExpired: true,
      message: 'Session cookie has expired or failed.',
    });

    const wrapper = mount(PreferredIndexerAlertBanner, {
      global: {
        stubs: {
          'router-link': true,
        },
      },
    });

    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('BJ-Share Cookie Expired');
    expect(wrapper.text()).toContain('Tracker session is inactive');
    expect(wrapper.find('router-link-stub').attributes('to')).toBe('/admin?tab=config');
  });

  it('renders alert banner for admin when cookie is missing', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'a1', username: 'admin', role: 'admin' } as any;

    vi.mocked(api.get).mockResolvedValueOnce({
      configured: true,
      indexerName: 'BJ-Share',
      status: 'missing',
      isExpired: true,
      message: 'No cookie configured.',
    });

    const wrapper = mount(PreferredIndexerAlertBanner, {
      global: {
        stubs: {
          'router-link': true,
        },
      },
    });

    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('BJ-Share Cookie Missing');
  });
});
