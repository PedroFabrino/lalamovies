import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DiscoveryFeed, { DiscoveryItem } from '../src/components/DiscoveryFeed.vue';
import { api } from '../src/lib/api';

const mockPush = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

let store: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = String(value);
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    store = {};
  },
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('DiscoveryFeed.vue - Component Tests', () => {
  const sampleMovieItem: DiscoveryItem = {
    id: 'movie-1',
    title: 'Gladiator II',
    rawTitle: 'Gladiator.II.2024.1080p.WEB-DL',
    mediaType: 'movie',
    year: 2024,
    posterUrl: 'https://image.tmdb.org/t/p/w500/gladiator.jpg',
    rating: 8.4,
    overview: 'Epic historical action film',
    resolution: '1080p',
    sizeBytes: 2500000000,
    formattedSize: '2.5 GB',
    seeders: 42,
    indexer: 'Tracker X',
    downloadUrl: 'magnet:?xt=urn:btih:gladiator',
    score: 130,
    metadataId: '558449',
    metadataSource: 'tmdb',
  };

  const sampleTvItem: DiscoveryItem = {
    id: 'tv-1',
    title: 'Severance',
    rawTitle: 'Severance.S02E01.1080p.WEB',
    mediaType: 'tv_show',
    year: 2025,
    seasonNumber: 2,
    episodeNumber: 1,
    posterUrl: 'https://image.tmdb.org/t/p/w500/severance.jpg',
    rating: 8.9,
    overview: 'Mark Scout leads a team at Lumon Industries',
    resolution: '1080p',
    sizeBytes: 1500000000,
    formattedSize: '1.5 GB',
    seeders: 60,
    indexer: 'Tracker Y',
    downloadUrl: 'magnet:?xt=urn:btih:severance',
    score: 140,
    metadataId: '95396',
    metadataSource: 'tmdb',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = {};
  });

  it('fetches movies feed on mount and renders cards with badges', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      available: true,
      items: [sampleMovieItem],
    });

    const wrapper = mount(DiscoveryFeed);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/discovery/feed?category=movies');

    // Verify section rendered
    expect(wrapper.find('[data-testid="discovery-feed-section"]').exists()).toBe(true);

    // Verify card rendered
    const card = wrapper.find('[data-testid="discovery-card"]');
    expect(card.exists()).toBe(true);
    expect(card.text()).toContain('Gladiator II');
    expect(card.text()).toContain('2024');
    expect(card.text()).toContain('2.5 GB');
    expect(card.text()).toContain('Tracker X');

    // Verify badges
    expect(card.find('[data-testid="badge-resolution"]').text()).toBe('1080p');
    expect(card.find('[data-testid="badge-rating"]').text()).toContain('8.4');
    expect(card.find('[data-testid="badge-seeders"]').text()).toContain('42');
  });

  it('switches category tabs and fetches new category data', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        available: true,
        items: [sampleMovieItem],
      })
      .mockResolvedValueOnce({
        available: true,
        items: [sampleTvItem],
      });

    const wrapper = mount(DiscoveryFeed);
    await flushPromises();

    // Click TV Shows tab
    const tvTab = wrapper.find('[data-testid="tab-tv"]');
    await tvTab.trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/discovery/feed?category=tv');
    expect(wrapper.text()).toContain('Severance');
    expect(wrapper.text()).toContain('S02E01');
  });

  it('toggles collapse/expand and saves state to localStorage', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      available: true,
      items: [sampleMovieItem],
    });

    const wrapper = mount(DiscoveryFeed);
    await flushPromises();

    expect(wrapper.find('[data-testid="discovery-cards-container"]').exists()).toBe(true);

    // Click toggle collapse
    const toggleBtn = wrapper.find('[data-testid="toggle-collapse"]');
    await toggleBtn.trigger('click');
    await flushPromises();

    // Cards container should be hidden when collapsed
    expect(wrapper.find('[data-testid="discovery-cards-container"]').exists()).toBe(false);
    expect(localStorage.getItem('mdm_discovery_collapsed')).toBe('true');

    // Click again to expand
    await toggleBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="discovery-cards-container"]').exists()).toBe(true);
    expect(localStorage.getItem('mdm_discovery_collapsed')).toBe('false');
  });

  it('navigates directly to /request Step 3 on card click with all query parameters', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      available: true,
      items: [sampleMovieItem],
    });

    const wrapper = mount(DiscoveryFeed);
    await flushPromises();

    const card = wrapper.find('[data-testid="discovery-card"]');
    await card.trigger('click');

    expect(mockPush).toHaveBeenCalledWith({
      path: '/request',
      query: {
        title: 'Gladiator II',
        metadataId: '558449',
        metadataSource: 'tmdb',
        mediaType: 'movie',
        year: '2024',
        seasonNumber: undefined,
        episodeNumber: undefined,
        downloadUrl: 'magnet:?xt=urn:btih:gladiator',
        releaseTitle: 'Gladiator.II.2024.1080p.WEB-DL',
        resolution: '1080p',
        seeders: '42',
        indexer: 'Tracker X',
        sizeBytes: '2500000000',
        posterUrl: 'https://image.tmdb.org/t/p/w500/gladiator.jpg',
        overview: 'Epic historical action film',
      },
      state: {
        title: 'Gladiator II',
        metadataId: '558449',
        metadataSource: 'tmdb',
        mediaType: 'movie',
        year: 2024,
        seasonNumber: undefined,
        episodeNumber: undefined,
        downloadUrl: 'magnet:?xt=urn:btih:gladiator',
        releaseTitle: 'Gladiator.II.2024.1080p.WEB-DL',
        resolution: '1080p',
        seeders: 42,
        indexer: 'Tracker X',
        sizeBytes: 2500000000,
        posterUrl: 'https://image.tmdb.org/t/p/w500/gladiator.jpg',
        overview: 'Epic historical action film',
      },
    });
  });

  it('hides gracefully when available is false or API throws', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      available: false,
      items: [],
    });

    const wrapper = mount(DiscoveryFeed);
    await flushPromises();

    expect(wrapper.find('[data-testid="discovery-feed-section"]').exists()).toBe(false);
  });
});
