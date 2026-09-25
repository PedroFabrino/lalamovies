import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LibraryView from '../src/views/LibraryView.vue';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../src/components/Navbar.vue', () => ({
  default: { name: 'Navbar', template: '<div data-testid="navbar" />' },
}));

vi.mock('../src/components/requests/SeasonPackEpisodesModal.vue', () => ({
  default: {
    name: 'SeasonPackEpisodesModal',
    template: '<div v-if="show" data-testid="stubbed-episodes-modal">SeasonPackEpisodesModal Stub</div>',
    props: ['show', 'requestId', 'title', 'isAdmin', 'canManage'],
    emits: ['close', 'episodePruned'],
  },
}));

describe('LibraryView - Episode Pruning in Series/Anime Cards', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockLibrary = {
    movies: [
      {
        id: 'movie-1',
        requestIds: ['movie-1'],
        title: 'Interstellar',
        year: 2014,
        mediaType: 'movie',
        sizeBytes: 10000000,
        jellyfinPath: '/media/movies/Interstellar (2014)',
        requestedBy: { id: 'u1', username: 'alice' },
        coRequesters: [],
        canManage: true,
      },
    ],
    shows: [
      {
        id: 'show-1',
        requestIds: ['show-req-1'],
        title: 'Severance',
        year: 2022,
        mediaType: 'tv_show',
        sizeBytes: 50000000,
        jellyfinPath: '/media/shows/Severance',
        requestedBy: { id: 'u1', username: 'alice' },
        coRequesters: [],
        canManage: true,
        seasons: [
          {
            seasonNumber: 1,
            episodeCount: 9,
            sizeBytes: 50000000,
            episodes: [
              {
                id: 'show-req-1',
                episodeNumber: null,
                title: 'Severance S01',
                sizeBytes: 50000000,
                jellyfinPath: '/media/shows/Severance/Season 01',
              },
            ],
          },
        ],
      },
    ],
    anime: [],
  };

  it('renders episodes button on series card and opens modal on click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockLibrary);

    const wrapper = mount(LibraryView);
    await flushPromises();

    // Switch to Series tab
    await wrapper.find('[data-testid="tab-shows"]').trigger('click');
    await flushPromises();

    // Verify episodes button exists on the show card
    const episodesBtn = wrapper.find('[data-testid="library-episodes-btn"]');
    expect(episodesBtn.exists()).toBe(true);

    // Modal initially not shown
    expect(wrapper.find('[data-testid="stubbed-episodes-modal"]').exists()).toBe(false);

    // Click episodes button
    await episodesBtn.trigger('click');
    expect(wrapper.find('[data-testid="stubbed-episodes-modal"]').exists()).toBe(true);
  });

  it('renders episodes button in expanded season accordion', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockLibrary);

    const wrapper = mount(LibraryView);
    await flushPromises();

    // Switch to Series tab
    await wrapper.find('[data-testid="tab-shows"]').trigger('click');
    await flushPromises();

    // Expand seasons accordion
    const expandBtn = wrapper.find('[data-testid="expand-seasons-btn"]');
    await expandBtn.trigger('click');

    // Season episodes button exists
    const seasonEpBtn = wrapper.find('[data-testid="season-episodes-btn"]');
    expect(seasonEpBtn.exists()).toBe(true);

    // Click season episodes button opens modal
    await seasonEpBtn.trigger('click');
    expect(wrapper.find('[data-testid="stubbed-episodes-modal"]').exists()).toBe(true);
  });
});
