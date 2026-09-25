import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import WaitlistView from '../src/views/WaitlistView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';

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

describe('WaitlistDateGating - Unconfirmed Release Dates and TBA Gating (Spec 164)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRouteQuery = {};
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
    });
  });

  it('resets targetAirDate to null and displays Date TBA in confirmation step when changing to unannounced season', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.startsWith('/waitlist')) {
        return { entries: [] } as any;
      }
      if (url.startsWith('/requests/series-progress')) {
        // Return null airDate for Season 3
        return {
          hasExisting: false,
          inLibrary: false,
          suggestedSeason: 3,
          suggestedEpisode: 1,
          airDate: null,
        } as any;
      }
      return {} as any;
    });

    vi.mocked(api.post).mockImplementation(async (url: string, payload: any) => {
      if (url === '/requests/search-metadata') {
        return {
          candidates: [
            {
              id: 'anime-1234',
              source: 'anilist',
              title: 'Country Bumpkin Swordsman',
              year: 2024,
              releaseDate: '2024-04-01',
              posterUrl: 'https://image.example.com/poster.jpg',
            },
          ],
        } as any;
      }
      if (url === '/requests/search-releases') {
        return { releases: [] } as any;
      }
      if (url === '/waitlist') {
        return {
          entry: {
            id: 'created-entry-1',
            userId: 'user-1',
            mediaType: payload.mediaType,
            metadataId: payload.metadataId,
            metadataSource: payload.metadataSource,
            title: payload.title,
            seasonNumber: payload.seasonNumber,
            targetEpisode: payload.targetEpisode,
            status: 'pending_release',
            tmdbReleaseDate: payload.tmdbReleaseDate,
            createdAt: new Date().toISOString(),
          },
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(WaitlistView);
    await flushPromises();

    // Open Add to Waitlist modal
    const addBtn = wrapper.find('[data-testid="open-add-waitlist-modal"]');
    expect(addBtn.exists()).toBe(true);
    await addBtn.trigger('click');
    await flushPromises();

    // Set anime media type
    const animeRadio = wrapper.find('input[name="modalMediaType"][value="anime"]');
    await animeRadio.setValue();

    // Search and select candidate
    const searchInput = wrapper.find('[data-testid="search-waitlist-input"]');
    await searchInput.setValue('Country Bumpkin');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    const candidateItem = wrapper.find('[data-testid="search-candidate-item"]');
    expect(candidateItem.exists()).toBe(true);
    await candidateItem.trigger('click');
    await flushPromises();

    // Candidate initially had 2024-04-01, but changing season to 3 should query series-progress
    // which returns airDate: null and resets targetAirDate to null
    const seasonInput = wrapper.find('[data-testid="waitlist-season-input"]');
    expect(seasonInput.exists()).toBe(true);
    await seasonInput.setValue(3);
    await seasonInput.trigger('change');
    await flushPromises();

    // Confirmation step should display "Date TBA"
    const airDateDisplay = wrapper.find('[data-testid="confirm-air-date-value"]');
    expect(airDateDisplay.exists()).toBe(true);
    expect(airDateDisplay.text()).toContain('Date TBA');

    // Confirm adding to waitlist
    const confirmBtn = wrapper.find('[data-testid="confirm-add-waitlist-btn"]');
    await confirmBtn.trigger('click');
    await flushPromises();

    // Backend payload should have received tmdbReleaseDate: null
    expect(api.post).toHaveBeenCalledWith('/waitlist', expect.objectContaining({
      mediaType: 'anime',
      metadataId: 'anime-1234',
      metadataSource: 'anilist',
      title: 'Country Bumpkin Swordsman',
      seasonNumber: 3,
      tmdbReleaseDate: null,
    }));
  });

  it('displays Date TBA header badge and Pending Release subtext for undated entries', async () => {
    const mockEntries = [
      {
        id: 'undated-entry-1',
        userId: 'user-1',
        mediaType: 'anime',
        metadataId: 'anime-999',
        metadataSource: 'anilist',
        title: 'Country Bumpkin Swordsman Season 3',
        year: 2026,
        seasonNumber: 3,
        targetEpisode: 1,
        status: 'pending_release',
        tmdbReleaseDate: null,
        createdAt: '2026-09-25T00:00:00.000Z',
      },
    ];

    vi.mocked(api.get).mockResolvedValue({ entries: mockEntries } as any);

    const wrapper = mount(WaitlistView);
    await flushPromises();

    // Verify header badge displays "Date TBA"
    const releaseBadge = wrapper.find('[data-testid="entry-release-date-badge"]');
    expect(releaseBadge.exists()).toBe(true);
    expect(releaseBadge.text()).toContain('Date TBA');

    // Verify status badge
    const statusBadge = wrapper.find('[data-testid="entry-status-badge"]');
    expect(statusBadge.text()).toContain('Pending Release');

    // Verify status subtext
    expect(wrapper.text()).toContain('No release date announced as of yet • Checking APIs for updates');
  });

  it('displays custom toast message when checking entry returns res.message', async () => {
    const mockEntries = [
      {
        id: 'undated-entry-2',
        userId: 'user-1',
        mediaType: 'anime',
        metadataId: 'anime-999',
        metadataSource: 'anilist',
        title: 'Country Bumpkin Swordsman Season 3',
        status: 'pending_release',
        tmdbReleaseDate: null,
        createdAt: '2026-09-25T00:00:00.000Z',
      },
    ];

    vi.mocked(api.get).mockResolvedValue({ entries: mockEntries } as any);
    vi.mocked(api.post).mockResolvedValue({
      ok: true,
      message: 'Checked APIs — still no confirmed release date announced',
      entry: mockEntries[0],
    } as any);

    const wrapper = mount(WaitlistView);
    await flushPromises();

    // Trigger check on card
    const checkBtn = wrapper.find('[data-testid="check-now-btn"]');
    expect(checkBtn.exists()).toBe(true);
    await checkBtn.trigger('click');
    await flushPromises();

    // Toast alert should display backend message
    const toast = wrapper.find('[data-testid="waitlist-toast"]');
    expect(toast.exists()).toBe(true);
    expect(toast.text()).toContain('Checked APIs — still no confirmed release date announced');
  });
});
