import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AnimeDetailModal from '../src/components/anime/AnimeDetailModal.vue';
import { api } from '../src/lib/api';

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

const mockAnime = {
  id: 199999,
  title: {
    romaji: 'Unknown Obscure Anime',
    english: 'Unknown Obscure Anime',
    native: '不明なアニメ',
  },
  format: 'TV',
  status: 'NOT_YET_RELEASED' as const,
  episodes: 12,
  season: 'FALL' as const,
  seasonYear: 2026,
  startDate: { year: 2026, month: 10, day: 1 },
  coverImage: {
    extraLarge: 'https://img/obscure.jpg',
    large: 'https://img/obscure.jpg',
    medium: 'https://img/obscure.jpg',
  },
  bannerImage: null,
  genres: ['Fantasy'],
  averageScore: 65,
  popularity: 1000,
  description: 'An obscure show without immediate match',
  trailer: null,
};

describe('AnimeDetailModal Strict TMDB Ingestion & Manual Search (Ticket 01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('eliminates AniList bypass button when TMDB match is missing and unlocks submission via manual search', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/waitlist') return { entries: [] };
      return {};
    });

    // 1. Initial automated resolve returns empty candidates
    vi.mocked(api.post).mockImplementation(async (url: string, payload: any) => {
      if (url === '/anime/resolve-tmdb') {
        if (payload?.title === 'Correct TMDB Title') {
          return {
            candidates: [
              {
                id: '998877',
                title: 'Correct TMDB Title',
                year: 2026,
                posterUrl: 'https://img/correct-tmdb.jpg',
                overview: 'The real canonical TMDB show overview.',
              },
            ],
            recommended: {
              id: '998877',
              title: 'Correct TMDB Title',
              year: 2026,
              posterUrl: 'https://img/correct-tmdb.jpg',
              overview: 'The real canonical TMDB show overview.',
            },
            detectedSeason: 1,
          };
        }
        return {
          candidates: [],
          recommended: null,
        };
      }
      if (url === '/waitlist') {
        return {
          entry: { id: 'w-new-1', ...payload },
        };
      }
      return {};
    });

    const wrapper = mount(AnimeDetailModal, {
      props: {
        anime: mockAnime,
      },
    });

    // Open waitlist flow
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Add to Waitlist'));
    expect(addBtn).toBeDefined();
    await addBtn!.trigger('click');
    await flushPromises();

    // Verify resolve-tmdb was queried
    expect(api.post).toHaveBeenCalledWith('/anime/resolve-tmdb', expect.objectContaining({
      anilistId: 199999,
      title: 'Unknown Obscure Anime',
    }));

    // 2. Assert direct AniList bypass button DOES NOT exist
    const buttons = wrapper.findAll('button');
    const bypassBtn = buttons.find((b) => b.text().toLowerCase().includes('cleaned anilist title'));
    expect(bypassBtn).toBeUndefined();

    // 3. Assert fallback manual search input exists
    const manualInput = wrapper.find('[data-testid="manual-tmdb-search-input"]');
    expect(manualInput.exists()).toBe(true);
    const searchBtn = wrapper.find('[data-testid="manual-tmdb-search-btn"]');
    expect(searchBtn.exists()).toBe(true);

    // 4. Enter correct TMDB title and trigger manual search
    await manualInput.setValue('Correct TMDB Title');
    await searchBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/anime/resolve-tmdb', expect.objectContaining({
      title: 'Correct TMDB Title',
    }));

    // 5. Now candidate is resolved, confirm button is visible and active
    const confirmBtn = wrapper.findAll('button').find((b) => b.text().includes('Confirm & Add to Waitlist'));
    expect(confirmBtn).toBeDefined();
    expect(confirmBtn!.attributes('disabled')).toBeUndefined();

    // 6. Click Confirm & Add to Waitlist
    await confirmBtn!.trigger('click');
    await flushPromises();

    // 7. Verify /waitlist was called with canonical TMDB source and ID
    expect(api.post).toHaveBeenCalledWith('/waitlist', expect.objectContaining({
      mediaType: 'anime',
      metadataSource: 'tmdb',
      metadataId: '998877',
      title: 'Correct TMDB Title',
    }));
  });

  it('prompts TMDB resolution when clicking Download Torrent and emits canonical TMDB metadata upon confirmation', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/waitlist') return { entries: [] };
      return {};
    });

    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/anime/resolve-tmdb') {
        return {
          candidates: [
            {
              id: '54321',
              title: 'Resolved Show TMDB',
              year: 2026,
              posterUrl: 'https://img/54321.jpg',
            },
          ],
          recommended: {
            id: '54321',
            title: 'Resolved Show TMDB',
            year: 2026,
            posterUrl: 'https://img/54321.jpg',
          },
          detectedSeason: 1,
        };
      }
      return {};
    });

    const wrapper = mount(AnimeDetailModal, {
      props: {
        anime: {
          ...mockAnime,
          status: 'RELEASING' as const,
        },
      },
    });

    // 1. Click Download Torrent
    const downloadBtn = wrapper.findAll('button').find((b) => b.text().includes('Download Torrent'));
    expect(downloadBtn).toBeDefined();
    await downloadBtn!.trigger('click');
    await flushPromises();

    // 2. TMDB confirmation section is displayed with actionType download
    const confirmDownloadBtn = wrapper.findAll('button').find((b) => b.text().includes('Confirm & Download Torrent'));
    expect(confirmDownloadBtn).toBeDefined();

    // 3. Confirm download
    await confirmDownloadBtn!.trigger('click');
    await flushPromises();

    // 4. Assert download event emitted with TMDB candidate
    const emitted = wrapper.emitted('download');
    expect(emitted).toBeDefined();
    expect(emitted![0][1]).toMatchObject({
      id: '54321',
      title: 'Resolved Show TMDB',
    });
  });
});
