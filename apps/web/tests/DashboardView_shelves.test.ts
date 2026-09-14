import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DashboardView from '../src/views/DashboardView.vue';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';
import { useFeatureFlags } from '../src/composables/useFeatureFlags';
import { api } from '../src/lib/api';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
}));

vi.mock('../src/components/Navbar.vue', () => ({
  default: { template: '<div data-testid="mock-navbar"></div>' },
}));

vi.mock('../src/components/UpNextShelf.vue', () => ({
  default: { template: '<div data-testid="mock-up-next"></div>' },
}));

vi.mock('../src/components/DiscoveryFeed.vue', () => ({
  default: { template: '<div data-testid="mock-discovery-feed"></div>' },
}));

vi.mock('../src/components/ActiveStreamsShelf.vue', () => ({
  default: {
    template: '<div data-testid="mock-active-streams"></div>',
    methods: { fetchStreams: vi.fn() },
  },
}));

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
    }
  },
}));

describe('DashboardView - Content & Discovery Shelves Gating (Subtask #90)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.user = { id: 'usr_1', username: 'alice', role: 'user', jellyfinUserId: 'jf_1' };

    const ff = useFeatureFlags();
    ff.reset();

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/requests') return { requests: [] };
      if (url === '/features') {
        return {
          discovery_feed: true,
          up_next: true,
          streaming: true,
        };
      }
      return {};
    });
  });

  it('renders all shelves when flags are enabled', async () => {
    const ff = useFeatureFlags();
    ff.setFlags({
      discovery_feed: true,
      up_next: true,
      streaming: true,
    });

    const wrapper = mount(DashboardView, {
      global: {
        stubs: ['router-link'],
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="mock-up-next"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mock-discovery-feed"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mock-active-streams"]').exists()).toBe(true);
  });

  it('hides shelves dynamically when corresponding feature flags are disabled', async () => {
    const ff = useFeatureFlags();
    ff.setFlags({
      discovery_feed: false,
      up_next: false,
      streaming: false,
    });

    const wrapper = mount(DashboardView, {
      global: {
        stubs: ['router-link'],
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="mock-up-next"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mock-discovery-feed"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mock-active-streams"]').exists()).toBe(false);

    // Reactively enable streaming
    ff.setFlag('streaming', true);
    await flushPromises();

    expect(wrapper.find('[data-testid="mock-active-streams"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mock-discovery-feed"]').exists()).toBe(false);
  });
});
