import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AnimeView from '../src/views/AnimeView.vue';
import AnimeDetailModal from '../src/components/anime/AnimeDetailModal.vue';
import { api } from '../src/lib/api';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => ({
    path: '/anime',
    query: {},
  }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../src/stores/auth', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    user: { id: 'u1', username: 'tester', role: 'user' },
    isAdmin: false,
    isTrusted: false,
  }),
}));

vi.mock('../src/stores/requests', () => ({
  useRequestsStore: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../src/composables/useProgressSocket', () => ({
  useProgressSocket: () => ({
    isConnected: true,
  }),
}));

const mountOptions = {
  global: {
    stubs: {
      'router-link': true,
    },
  },
};

describe('AnimeView.vue & Components', () => {
  const mockAnime = {
    id: 151807,
    title: { romaji: 'Ore dake Level Up na Ken', english: 'Solo Leveling', native: null },
    format: 'TV',
    status: 'NOT_YET_RELEASED',
    episodes: 12,
    season: 'WINTER',
    seasonYear: 2024,
    startDate: { year: 2024, month: 1, day: 7 },
    coverImage: { extraLarge: 'https://img/sl.jpg', large: 'https://img/sl.jpg', medium: 'https://img/sl.jpg' },
    bannerImage: 'https://img/sl-banner.jpg',
    genres: ['Action', 'Fantasy'],
    averageScore: 84,
    popularity: 120000,
    description: '10 years ago, after the Gate that connected the real world with the monster world opened...',
    trailer: { id: '918237', site: 'youtube' },
  };

  const mockSequel = {
    ...mockAnime,
    id: 173000,
    title: { romaji: 'Ore dake Level Up na Ken Season 2', english: 'Solo Leveling Season 2', native: null },
    prequelTitle: 'Sequel to Solo Leveling',
    matchedRelationType: 'PREQUEL',
  };

  const mockAiringAnime = {
    ...mockAnime,
    id: 154587,
    title: { romaji: 'Sousou no Frieren', english: 'Frieren: Beyond Journey\'s End', native: null },
    status: 'RELEASING',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mounts, fetches /anime/seasonal, and renders sections', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/features') {
        return { seasonal_anime: true, streaming: true };
      }
      if (url === '/anime/seasonal') {
        return {
          trending: [mockAiringAnime],
          popularThisSeason: [mockAiringAnime],
          upcomingNextSeason: [mockAnime, mockSequel],
          anticipatedSequels: [mockSequel],
        };
      }
      return {};
    });

    const wrapper = mount(AnimeView, mountOptions);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/anime/seasonal');
    expect(wrapper.find('[data-testid="anime-view"]').exists()).toBe(true);

    // Anticipated Sequels Shelf
    expect(wrapper.find('[data-testid="anticipated-sequels-shelf"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Anticipated Sequels');
    expect(wrapper.text()).toContain('Solo Leveling Season 2');

    // Sections
    expect(wrapper.find('[data-testid="trending-grid"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="popular-grid"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="upcoming-grid"]').exists()).toBe(true);
  });

  it('filters upcoming anime when toggling "From My Library"', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/features') return { seasonal_anime: true };
      if (url === '/anime/seasonal') {
        return {
          trending: [],
          popularThisSeason: [],
          upcomingNextSeason: [mockAnime, mockSequel],
          anticipatedSequels: [mockSequel],
        };
      }
      return {};
    });

    const wrapper = mount(AnimeView, mountOptions);
    await flushPromises();

    const upcomingSection = wrapper.find('[data-testid="upcoming-grid"]');
    // Initially shows both upcoming items
    expect(upcomingSection.findAll('[data-testid="anime-card"]')).toHaveLength(2);

    // Click "From My Library" filter button
    const libraryFilterBtn = upcomingSection.findAll('button').find((b) => b.text().includes('From My Library'));
    expect(libraryFilterBtn).toBeDefined();
    await libraryFilterBtn!.trigger('click');
    await flushPromises();

    // Now only shows the sequel
    expect(upcomingSection.findAll('[data-testid="anime-card"]')).toHaveLength(1);
    expect(upcomingSection.text()).toContain('Solo Leveling Season 2');
  });

  it('triggers fast-track download navigation on Download action', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/features') return { seasonal_anime: true };
      if (url === '/anime/seasonal') {
        return {
          trending: [mockAiringAnime],
          popularThisSeason: [],
          upcomingNextSeason: [],
          anticipatedSequels: [],
        };
      }
      return {};
    });

    const wrapper = mount(AnimeView, mountOptions);
    await flushPromises();

    const card = wrapper.find('[data-testid="anime-card"]');
    const downloadBtn = card.findAll('button').find((b) => b.text().includes('Download'));
    expect(downloadBtn).toBeDefined();

    await downloadBtn!.trigger('click');

    expect(mockPush).toHaveBeenCalledWith({
      path: '/request',
      query: {
        query: 'Frieren: Beyond Journey\'s End',
        mediaType: 'anime',
      },
    });
  });

  it('triggers instant stream on Stream action', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/features') return { seasonal_anime: true, streaming: true };
      if (url === '/anime/seasonal') {
        return {
          trending: [mockAiringAnime],
          popularThisSeason: [],
          upcomingNextSeason: [],
          anticipatedSequels: [],
        };
      }
      return {};
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      streamId: 'stm-123',
      status: 'ready',
    });

    const wrapper = mount(AnimeView, mountOptions);
    await flushPromises();

    const card = wrapper.find('[data-testid="anime-card"]');
    const streamBtn = card.findAll('button').find((b) => b.text().includes('Instant Stream'));
    expect(streamBtn).toBeDefined();

    await streamBtn!.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/streams', expect.objectContaining({
      title: 'Frieren: Beyond Journey\'s End',
      isPrivateTracker: false,
    }));
  });

  it('opens AnimeDetailModal, resolves TMDB match, selects episodic mode, and adds to waitlist', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/anime/resolve-tmdb') {
        return {
          candidates: [
            { id: '1100', source: 'tmdb', title: 'Solo Leveling', year: 2024, posterUrl: '/p.jpg', overview: 'TMDB Overview' },
          ],
          recommended: { id: '1100', source: 'tmdb', title: 'Solo Leveling', year: 2024, posterUrl: '/p.jpg', overview: 'TMDB Overview' },
        };
      }
      if (url === '/waitlist') {
        return { status: 'ok', id: 'w-1' };
      }
      return {};
    });

    const wrapper = mount(AnimeDetailModal, {
      props: {
        anime: mockAnime,
        isStreamingEnabled: true,
      },
    });

    expect(wrapper.find('[data-testid="anime-detail-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Solo Leveling');

    // Click "+ Add to Waitlist"
    const addWaitlistBtn = wrapper.findAll('button').find((b) => b.text().includes('Add to Waitlist'));
    expect(addWaitlistBtn).toBeDefined();
    await addWaitlistBtn!.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/anime/resolve-tmdb', expect.objectContaining({
      anilistId: 151807,
      title: 'Solo Leveling',
    }));

    // Confirmation screen rendered
    expect(wrapper.find('[data-testid="tmdb-confirmation-flow"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Weekly Episodic Tracking');

    // Confirm submission
    const confirmBtn = wrapper.findAll('button').find((b) => b.text().includes('Confirm & Add to Waitlist'));
    expect(confirmBtn).toBeDefined();
    await confirmBtn!.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/waitlist', expect.objectContaining({
      mediaType: 'anime',
      metadataId: '1100',
      metadataSource: 'tmdb',
      seasonNumber: 1,
      targetEpisode: 1,
    }));
  });

  it('switches to archive browsing when season/quarter is selected', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/features') return { seasonal_anime: true };
      if (url === '/anime/seasonal') {
        return { trending: [], popularThisSeason: [], upcomingNextSeason: [], anticipatedSequels: [] };
      }
      if (url.startsWith('/anime/seasons')) {
        return {
          pageInfo: { total: 10, perPage: 24, currentPage: 1, lastPage: 1, hasNextPage: false },
          items: [{ ...mockAnime, id: 999, title: { romaji: 'Archived Anime', english: 'Archived Anime', native: null } }],
        };
      }
      return {};
    });

    const wrapper = mount(AnimeView, mountOptions);
    await flushPromises();

    const select = wrapper.find('select');
    expect(select.exists()).toBe(true);

    // Change quarter dropdown
    await select.setValue('WINTER:2025');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/anime/seasons?season=WINTER&year=2025'));
    expect(wrapper.find('[data-testid="archive-grid"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Archived Anime');
  });
});
