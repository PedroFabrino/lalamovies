import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import WaitlistView from '../src/views/WaitlistView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';
import { STORAGE_KEY } from '../src/composables/useWaitlistTiers';

let mockRouteQuery: Record<string, any> = {};
const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
  useRoute: () => ({
    query: mockRouteQuery,
    params: {},
  }),
}));

vi.mock('../src/components/Navbar.vue', () => ({
  default: {
    template: '<div data-testid="mock-navbar"></div>',
  },
}));

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
    }
  },
}));

describe('WaitlistView - Tier Partitioning and Collapsible Sections (#222)', () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRouteQuery = {};
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      },
      clear: () => {
        storage = {};
      },
    });
  });

  const mockEntries = [
    {
      id: 'entry-awaiting',
      userId: 'user-1',
      mediaType: 'movie',
      metadataId: '101',
      metadataSource: 'tmdb',
      title: 'Awaiting Movie',
      status: 'notified',
      notifyAt: new Date().toISOString(),
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'entry-released',
      userId: 'user-1',
      mediaType: 'tv_show',
      metadataId: '102',
      metadataSource: 'tmdb',
      title: 'Released Show',
      seasonNumber: 1,
      targetEpisode: 1,
      status: 'checking',
      tmdbReleaseDate: '2025-01-01',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'entry-upcoming',
      userId: 'user-1',
      mediaType: 'movie',
      metadataId: '103',
      metadataSource: 'tmdb',
      title: 'Upcoming Movie',
      status: 'pending_release',
      tmdbReleaseDate: '2099-01-01',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'entry-unscheduled',
      userId: 'user-1',
      mediaType: 'anime',
      metadataId: '104',
      metadataSource: 'tmdb',
      title: 'Unscheduled Anime',
      status: 'pending_release',
      tmdbReleaseDate: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'entry-archived',
      userId: 'user-1',
      mediaType: 'movie',
      metadataId: '105',
      metadataSource: 'tmdb',
      title: 'Archived Movie',
      status: 'completed',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  it('renders all 5 tiers with correct badges and default expansion states', async () => {
    vi.mocked(api.get).mockResolvedValue({ entries: mockEntries } as any);

    const wrapper = mount(WaitlistView, { attachTo: document.body });
    await flushPromises();

    // Verify all 5 tier sections exist
    const tierKeys = ['awaiting', 'released', 'upcoming', 'unscheduled', 'archive'];
    for (const key of tierKeys) {
      const section = wrapper.find(`[data-testid="waitlist-tier-${key}"]`);
      expect(section.exists()).toBe(true);

      const badge = wrapper.find(`[data-testid="tier-badge-${key}"]`);
      expect(badge.text()).toBe('1');
    }

    // Tiers 1-4 should be visible, Tier 5 (Archive) collapsed
    expect(wrapper.find('[data-testid="tier-body-awaiting"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="tier-body-released"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="tier-body-upcoming"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="tier-body-unscheduled"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="tier-body-archive"]').isVisible()).toBe(false);
  });

  it('toggles archive tier and persists to localStorage', async () => {
    vi.mocked(api.get).mockResolvedValue({ entries: mockEntries } as any);

    const wrapper = mount(WaitlistView, { attachTo: document.body });
    await flushPromises();

    // Initially collapsed
    expect(wrapper.find('[data-testid="tier-body-archive"]').isVisible()).toBe(false);

    // Click toggle
    const toggleArchive = wrapper.find('[data-testid="tier-toggle-archive"]');
    await toggleArchive.trigger('click');
    await flushPromises();

    // Now expanded
    expect(wrapper.find('[data-testid="tier-body-archive"]').isVisible()).toBe(true);

    // Verify localStorage persistence
    const saved = JSON.parse(storage[STORAGE_KEY]);
    expect(saved.archive).toBe(true);
  });

  it('shows empty placeholder when an expanded tier has 0 entries', async () => {
    // Only one entry in 'awaiting', other tiers are empty
    vi.mocked(api.get).mockResolvedValue({
      entries: [mockEntries[0]],
    } as any);

    const wrapper = mount(WaitlistView, { attachTo: document.body });
    await flushPromises();

    // 'released' tier is expanded by default but has 0 entries
    const releasedSection = wrapper.find('[data-testid="waitlist-tier-released"]');
    expect(releasedSection.exists()).toBe(true);

    const placeholder = releasedSection.find('[data-testid="tier-empty-placeholder"]');
    expect(placeholder.exists()).toBe(true);
    expect(placeholder.text()).toContain('No released media currently searching');
  });

  it('toggles all tiers simultaneously with Expand All / Collapse All button', async () => {
    vi.mocked(api.get).mockResolvedValue({ entries: mockEntries } as any);

    const wrapper = mount(WaitlistView, { attachTo: document.body });
    await flushPromises();

    const collapseAllBtn = wrapper.find('[data-testid="toggle-collapse-all-btn"]');
    expect(collapseAllBtn.exists()).toBe(true);
    // Not all are expanded (archive is collapsed), so button says 'Expand All'
    expect(collapseAllBtn.text()).toContain('Expand All');

    // Click to Expand All
    await collapseAllBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="tier-body-archive"]').isVisible()).toBe(true);
    expect(collapseAllBtn.text()).toContain('Collapse All');

    // Click to Collapse All
    await collapseAllBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="tier-body-awaiting"]').isVisible()).toBe(false);
    expect(wrapper.find('[data-testid="tier-body-archive"]').isVisible()).toBe(false);
    expect(collapseAllBtn.text()).toContain('Expand All');
  });
});
