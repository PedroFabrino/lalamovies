import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AnimeView from '../src/views/AnimeView.vue';
import AnimeCard from '../src/components/anime/AnimeCard.vue';
import AnimeDetailModal from '../src/components/anime/AnimeDetailModal.vue';
import DiscoveryFeed from '../src/components/DiscoveryFeed.vue';
import UpNextShelf from '../src/components/UpNextShelf.vue';
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
    delete: vi.fn(),
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

describe('Anime Tab Waitlist Integration', () => {
  const mockAnime = {
    id: 177432,
    title: {
      romaji: 'Yasei no Last Boss ga Arawareta!',
      english: 'A Wild Last Boss Appeared!',
      native: '野生のラスボスが現れた！',
    },
    format: 'TV',
    status: 'NOT_YET_RELEASED',
    episodes: null,
    season: 'FALL',
    seasonYear: 2026,
    startDate: { year: 2026, month: 10, day: 1 },
    coverImage: {
      extraLarge: 'https://img/wild-last-boss.jpg',
      large: 'https://img/wild-last-boss.jpg',
      medium: 'https://img/wild-last-boss.jpg',
    },
    bannerImage: 'https://img/wild-last-boss-banner.jpg',
    genres: ['Action', 'Fantasy'],
    averageScore: 78,
    popularity: 50000,
    description: 'Exgate online MMORPG...',
    trailer: null,
  };

  const mockWaitlistEntry = {
    id: 'w-wild-boss-1',
    userId: 'u1',
    mediaType: 'anime' as const,
    metadataId: '177432',
    metadataSource: 'anilist' as const,
    title: 'A Wild Last Boss Appeared!',
    seasonNumber: 1,
    targetEpisode: null,
    status: 'pending_release' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    } as any;
  });

  it('still shows waitlisted anime on Anime tab, displays "Waitlisted" tag, and does not let user add it again', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/features') {
        return { seasonal_anime: true, streaming: true, waitlist: true };
      }
      if (url === '/anime/seasonal') {
        return {
          trending: [],
          popularThisSeason: [],
          upcomingNextSeason: [mockAnime],
          anticipatedSequels: [],
        };
      }
      if (url === '/waitlist') {
        return {
          entries: [mockWaitlistEntry],
        };
      }
      return {};
    });

    const wrapper = mount(AnimeView, mountOptions);
    await flushPromises();

    // 1. Must fetch waitlist entries on mount so Anime tab is aware of waitlisted shows
    expect(api.get).toHaveBeenCalledWith('/waitlist');

    // 2. The waitlisted anime must still be rendered on the Anime tab
    const upcomingSection = wrapper.find('[data-testid="upcoming-grid"]');
    expect(upcomingSection.exists()).toBe(true);
    const card = upcomingSection.find('[data-testid="anime-card"]');
    expect(card.exists()).toBe(true);
    expect(card.text()).toContain('A Wild Last Boss Appeared!');

    // 3. The card must have a "Waitlisted" tag / badge visible
    const waitlistTag = card.find('[data-testid="waitlist-badge"]');
    expect(waitlistTag.exists()).toBe(true);
    expect(waitlistTag.text().toLowerCase()).toContain('waitlist');

    // 4. The card must not let user add it again (hover action is disabled or shows "Waitlisted")
    const cardButtons = card.findAll('button');
    const addWaitlistBtn = cardButtons.find(
      (b) => b.text().includes('Add to Waitlist') || b.text().includes('+ Waitlist')
    );
    expect(addWaitlistBtn).toBeUndefined(); // Should not have an active "+ Add to Waitlist" button
    const waitlistedBtn = cardButtons.find((b) => b.text().toLowerCase().includes('waitlist'));
    expect(waitlistedBtn).toBeDefined();
    expect(waitlistedBtn!.attributes('disabled')).toBeDefined();

    // 5. In AnimeDetailModal, it must also show the tag and not let user add it again
    const modalWrapper = mount(AnimeDetailModal, {
      props: {
        anime: mockAnime,
        isStreamingEnabled: true,
        isWaitlisted: true,
      },
    });

    expect(modalWrapper.find('[data-testid="waitlist-badge"]').exists()).toBe(true);
    const modalAddBtn = modalWrapper
      .findAll('button')
      .find((b) => b.text().includes('Add to Waitlist') || b.text().includes('Watch on Waitlist'));
    expect(modalAddBtn).toBeUndefined();

    const modalWaitlistedBtn = modalWrapper
      .findAll('button')
      .find((b) => b.text().toLowerCase().includes('waitlist'));
    expect(modalWaitlistedBtn).toBeDefined();
    expect(modalWaitlistedBtn!.attributes('disabled')).toBeDefined();
  });

  it('renders WaitlistBadge on DiscoveryFeed cards when item is on waitlist', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/features') return { streaming: true, waitlist: true };
      if (url.startsWith('/discovery/feed')) {
        return {
          available: true,
          items: [
            {
              id: 'disc-1',
              title: 'A Wild Last Boss Appeared!',
              rawTitle: 'A.Wild.Last.Boss.Appeared.S01E01.1080p',
              mediaType: 'anime',
              year: 2026,
              seasonNumber: 1,
              episodeNumber: 1,
              resolution: '1080p',
              seeders: 50,
              sizeBytes: 1500000000,
              formattedSize: '1.5 GB',
              indexer: 'AnimeTracker',
              downloadUrl: 'magnet:?xt=urn:btih:wildboss',
              score: 110,
              metadataId: '177432',
              metadataSource: 'anilist',
            },
          ],
        };
      }
      if (url === '/waitlist') {
        return { entries: [mockWaitlistEntry] };
      }
      return {};
    });

    const wrapper = mount(DiscoveryFeed, mountOptions);
    await flushPromises();

    expect(wrapper.find('[data-testid="discovery-feed-section"]').exists()).toBe(true);
    const card = wrapper.find('[data-testid="discovery-card"]');
    expect(card.exists()).toBe(true);
    expect(card.find('[data-testid="waitlist-badge"]').exists()).toBe(true);
  });

  it('renders WaitlistBadge on UpNextShelf cards and sets fromUpNext=false when clicking waitlisted item', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/features') return { waitlist: true };
      if (url === '/discovery/up-next') {
        return {
          available: true,
          items: [
            {
              id: 'up-1',
              showTitle: 'A Wild Last Boss Appeared!',
              releaseTitle: 'A.Wild.Last.Boss.Appeared.S01E02.1080p',
              mediaType: 'anime',
              seasonNumber: 1,
              episodeNumber: 2,
              resolution: '1080p',
              seeders: 45,
              sizeBytes: 1400000000,
              formattedSize: '1.4 GB',
              indexer: 'AnimeTracker',
              downloadUrl: 'magnet:?xt=urn:btih:wildboss2',
              score: 115,
              metadataId: '177432',
              metadataSource: 'anilist',
              year: 2026,
            },
          ],
        };
      }
      if (url === '/waitlist') {
        return { entries: [mockWaitlistEntry] };
      }
      return {};
    });

    const wrapper = mount(UpNextShelf, mountOptions);
    await flushPromises();

    expect(wrapper.find('[data-testid="up-next-section"]').exists()).toBe(true);
    const card = wrapper.find('[data-testid="up-next-card"]');
    expect(card.exists()).toBe(true);
    expect(card.find('[data-testid="waitlist-badge"]').exists()).toBe(true);

    // Clicking the card navigates with fromUpNext: 'false' because already on waitlist
    await card.trigger('click');
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
      path: '/request',
      query: expect.objectContaining({
        fromUpNext: 'false',
        title: 'A Wild Last Boss Appeared!',
      }),
    }));
  });
});
