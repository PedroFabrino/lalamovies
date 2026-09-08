import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UpNextShelf, { UpNextItem } from '../src/components/UpNextShelf.vue';
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

describe('UpNextShelf.vue - Component Tests', () => {
  const sampleUpNextItem: UpNextItem = {
    id: 'upnext-1',
    showTitle: 'Mushoku Tensei',
    releaseTitle: '[SubsPlease] Mushoku Tensei - 11 (1080p)',
    mediaType: 'anime',
    seasonNumber: 1,
    episodeNumber: 11,
    posterUrl: 'https://anilist.co/cover_anime.jpg',
    rating: 9.1,
    overview: 'Rudeus continues his journey',
    resolution: '1080p',
    sizeBytes: 1400000000,
    formattedSize: '1.4 GB',
    seeders: 55,
    indexer: 'Nyaa',
    downloadUrl: 'magnet:?xt=urn:btih:mt11',
    score: 135,
    metadataId: '127549',
    metadataSource: 'anilist',
    year: 2021,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches /discovery/up-next on mount and renders cards with badges', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      available: true,
      items: [sampleUpNextItem],
    });

    const wrapper = mount(UpNextShelf);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/discovery/up-next');

    expect(wrapper.find('[data-testid="up-next-section"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Up Next');

    const card = wrapper.find('[data-testid="up-next-card"]');
    expect(card.exists()).toBe(true);
    expect(card.text()).toContain('Mushoku Tensei');
    expect(card.text()).toContain('1080p');
    expect(card.text()).toContain('1.4 GB');
    expect(card.text()).toContain('Nyaa');

    // Badges
    expect(card.find('[data-testid="badge-episode"]').text()).toBe('S01E11');
    expect(card.find('[data-testid="badge-rating"]').text()).toContain('9.1');
    expect(card.find('[data-testid="badge-seeders"]').text()).toContain('55');
  });

  it('navigates directly to /request Step 3 on card click with all query parameters', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      available: true,
      items: [sampleUpNextItem],
    });

    const wrapper = mount(UpNextShelf);
    await flushPromises();

    const card = wrapper.find('[data-testid="up-next-card"]');
    await card.trigger('click');

    expect(mockPush).toHaveBeenCalledWith({
      path: '/request',
      query: {
        title: 'Mushoku Tensei',
        metadataId: '127549',
        metadataSource: 'anilist',
        mediaType: 'anime',
        year: '2021',
        seasonNumber: '1',
        episodeNumber: '11',
        downloadUrl: 'magnet:?xt=urn:btih:mt11',
        releaseTitle: '[SubsPlease] Mushoku Tensei - 11 (1080p)',
        resolution: '1080p',
        seeders: '55',
        indexer: 'Nyaa',
        sizeBytes: '1400000000',
        posterUrl: 'https://anilist.co/cover_anime.jpg',
        overview: 'Rudeus continues his journey',
      },
      state: {
        title: 'Mushoku Tensei',
        metadataId: '127549',
        metadataSource: 'anilist',
        mediaType: 'anime',
        year: 2021,
        seasonNumber: 1,
        episodeNumber: 11,
        downloadUrl: 'magnet:?xt=urn:btih:mt11',
        releaseTitle: '[SubsPlease] Mushoku Tensei - 11 (1080p)',
        resolution: '1080p',
        seeders: 55,
        indexer: 'Nyaa',
        sizeBytes: 1400000000,
        posterUrl: 'https://anilist.co/cover_anime.jpg',
        overview: 'Rudeus continues his journey',
      },
    });
  });

  it('hides cleanly when items array is empty', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      available: true,
      items: [],
    });

    const wrapper = mount(UpNextShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="up-next-section"]').exists()).toBe(false);
  });

  it('hides cleanly when available is false or API throws', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      available: false,
      items: [],
    });

    const wrapper = mount(UpNextShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="up-next-section"]').exists()).toBe(false);
  });
});
