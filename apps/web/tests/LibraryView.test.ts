import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LibraryView from '../src/views/LibraryView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';
import { useRequestsStore } from '../src/stores/requests';

vi.mock('../src/components/Navbar.vue', () => ({
  default: {
    template: '<div data-testid="mock-navbar"></div>',
  },
}));

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
    }
  },
}));

describe('LibraryView - Catalog, Ownership, Move & Delete (Subtasks #95, #96, #97)', () => {
  const mockLibraryData = {
    movies: [
      {
        id: 'mov_1',
        requestIds: ['mov_1'],
        title: 'Inception',
        year: 2010,
        mediaType: 'movie',
        sizeBytes: 2500000000,
        jellyfinPath: '/media/movies/Inception (2010)/Inception.mkv',
        requestedBy: { id: 'usr_alice', username: 'alice' },
        coRequesters: [],
        canManage: true,
      },
      {
        id: 'mov_2',
        requestIds: ['mov_2'],
        title: 'Interstellar',
        year: 2014,
        mediaType: 'movie',
        sizeBytes: 4500000000,
        jellyfinPath: '/media/movies/Interstellar (2014)/Interstellar.mkv',
        requestedBy: { id: 'usr_bob', username: 'bob' },
        coRequesters: [{ id: 'usr_alice', username: 'alice' }],
        canManage: false,
      },
    ],
    shows: [
      {
        id: 'show_1',
        requestIds: ['ep_1', 'ep_2'],
        title: 'Severance',
        year: 2022,
        mediaType: 'tv_show',
        sizeBytes: 2200000000,
        jellyfinPath: '/media/shows/Severance (2022)',
        requestedBy: { id: 'usr_alice', username: 'alice' },
        coRequesters: [{ id: 'usr_bob', username: 'bob' }],
        canManage: true,
        seasons: [
          {
            seasonNumber: 1,
            episodeCount: 2,
            sizeBytes: 2200000000,
            episodes: [
              { id: 'ep_1', episodeNumber: 1, title: 'Good News About Hell', sizeBytes: 1100000000, jellyfinPath: null },
              { id: 'ep_2', episodeNumber: 2, title: 'Half Loop', sizeBytes: 1100000000, jellyfinPath: null },
            ],
          },
        ],
      },
    ],
    anime: [
      {
        id: 'ani_1',
        requestIds: ['ani_1'],
        title: 'Frieren: Beyond Journey’s End',
        year: 2023,
        mediaType: 'anime',
        sizeBytes: 800000000,
        jellyfinPath: '/media/anime/Frieren',
        requestedBy: { id: 'usr_bob', username: 'bob' },
        coRequesters: [],
        canManage: false,
      },
    ],
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    const authStore = useAuthStore();
    authStore.user = { id: 'usr_alice', username: 'alice', role: 'user', jellyfinUserId: 'jf_alice' };

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/library') {
        return JSON.parse(JSON.stringify(mockLibraryData));
      }
      return {};
    });
  });

  it('renders category segmented tabs with item counts and switches views', async () => {
    const wrapper = mount(LibraryView);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/library');

    // Tab buttons & badges
    const moviesTab = wrapper.find('[data-testid="tab-movies"]');
    const showsTab = wrapper.find('[data-testid="tab-shows"]');
    const animeTab = wrapper.find('[data-testid="tab-anime"]');

    expect(moviesTab.text()).toContain('Movies');
    expect(moviesTab.text()).toContain('2');

    expect(showsTab.text()).toContain('Series');
    expect(showsTab.text()).toContain('1');

    expect(animeTab.text()).toContain('Anime');
    expect(animeTab.text()).toContain('1');

    // Default active tab is Movies (2 items)
    expect(wrapper.text()).toContain('Inception');
    expect(wrapper.text()).toContain('Interstellar');
    expect(wrapper.text()).not.toContain('Severance');

    // Switch to Series tab
    await showsTab.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Severance');
    expect(wrapper.text()).not.toContain('Inception');

    // Switch to Anime tab
    await animeTab.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Frieren');
    expect(wrapper.text()).not.toContain('Severance');
  });

  it('enforces ownership scoping: enables checkbox on owned items and disables with tooltip on unowned items', async () => {
    const wrapper = mount(LibraryView);
    await flushPromises();

    const checkboxes = wrapper.findAll('[data-testid="item-checkbox"]');
    expect(checkboxes).toHaveLength(2);

    // Inception (requested by Alice -> canManage: true)
    expect(checkboxes[0].attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[data-testid="badge-you"]').exists()).toBe(true);

    // Interstellar (requested by Bob -> canManage: false)
    expect(checkboxes[1].attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-testid="badge-other"]').text()).toContain('@bob');

    // Tooltip present on disabled checkbox container
    const disabledContainer = checkboxes[1].element.closest('[title]');
    expect(disabledContainer?.getAttribute('title')).toContain('Only the requester or an admin');
  });

  it('filters media items by search query and "My Downloads Only" toggle', async () => {
    const wrapper = mount(LibraryView);
    await flushPromises();

    // Type "Inception" into search bar
    const searchInput = wrapper.find('input[placeholder="Search library..."]');
    await searchInput.setValue('Inception');
    await flushPromises();

    expect(wrapper.text()).toContain('Inception');
    expect(wrapper.text()).not.toContain('Interstellar');

    // Clear search
    await searchInput.setValue('');
    await flushPromises();
    expect(wrapper.text()).toContain('Interstellar');

    // Toggle "My Downloads Only"
    const myDownloadsCheckbox = wrapper.find('input[type="checkbox"][class*="w-4 h-4 rounded text-indigo-600"]');
    await myDownloadsCheckbox.setValue(true);
    await flushPromises();

    // Only Inception was requested by Alice
    expect(wrapper.text()).toContain('Inception');
    expect(wrapper.text()).not.toContain('Interstellar');
  });

  it('expands series cards to view seasons and episode breakdown', async () => {
    const wrapper = mount(LibraryView);
    await flushPromises();

    // Switch to Series tab
    await wrapper.find('[data-testid="tab-shows"]').trigger('click');
    await flushPromises();

    const expandBtn = wrapper.find('[data-testid="expand-seasons-btn"]');
    expect(expandBtn.exists()).toBe(true);
    expect(expandBtn.text()).toContain('1 Season (2 episodes)');

    // Initially collapsed
    expect(wrapper.find('[data-testid="expanded-seasons-content"]').exists()).toBe(false);

    // Click expand
    await expandBtn.trigger('click');
    await flushPromises();

    const expandedContent = wrapper.find('[data-testid="expanded-seasons-content"]');
    expect(expandedContent.exists()).toBe(true);
    expect(expandedContent.text()).toContain('Season 1');
    expect(expandedContent.text()).toContain('Good News About Hell');
    expect(expandedContent.text()).toContain('Half Loop');
  });

  it('shows floating bulk action bar on item selection and performs batch relocation', async () => {
    const requestsStore = useRequestsStore();
    const showToastSpy = vi.spyOn(requestsStore, 'showToast');
    vi.mocked(api.post).mockResolvedValueOnce({ success: true, movedCount: 1 });

    const wrapper = mount(LibraryView);
    await flushPromises();

    expect(wrapper.find('[data-testid="bulk-action-bar"]').exists()).toBe(false);

    // Check Inception
    const checkboxes = wrapper.findAll('[data-testid="item-checkbox"]');
    await checkboxes[0].setValue(true);
    await flushPromises();

    // Action bar visible
    const actionBar = wrapper.find('[data-testid="bulk-action-bar"]');
    expect(actionBar.exists()).toBe(true);
    expect(actionBar.text()).toContain('1 item selected');

    // Open Move Modal
    await wrapper.find('[data-testid="bulk-move-btn"]').trigger('click');
    await flushPromises();

    const moveModal = wrapper.find('[data-testid="move-modal"]');
    expect(moveModal.exists()).toBe(true);
    expect(moveModal.text()).toContain('Move Media Library Folders');
    expect(moveModal.text()).toContain('Inception');

    // Confirm Move
    await wrapper.find('[data-testid="confirm-move-btn"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/library/move', {
      requestIds: ['mov_1'],
      targetMediaType: 'tv_show',
    });
    expect(showToastSpy).toHaveBeenCalledWith('Media moved successfully!', 'success');
  });

  it('shows deletion confirmation modal with co-requester warning and executes deletion', async () => {
    const requestsStore = useRequestsStore();
    const showToastSpy = vi.spyOn(requestsStore, 'showToast');
    vi.mocked(api.post).mockResolvedValueOnce({ success: true, deletedCount: 2 });

    const wrapper = mount(LibraryView);
    await flushPromises();

    // Switch to Series tab (Severance has co-requester Bob)
    await wrapper.find('[data-testid="tab-shows"]').trigger('click');
    await flushPromises();

    // Select Severance
    const severanceCheckbox = wrapper.find('[data-testid="item-checkbox"]');
    await severanceCheckbox.setValue(true);
    await flushPromises();

    // Open Delete Modal
    await wrapper.find('[data-testid="bulk-delete-btn"]').trigger('click');
    await flushPromises();

    const deleteModal = wrapper.find('[data-testid="delete-modal"]');
    expect(deleteModal.exists()).toBe(true);
    expect(deleteModal.text()).toContain('Permanent Media Deletion');
    expect(deleteModal.text()).toContain('Severance');

    // Co-requester warning displayed!
    const coReqWarning = wrapper.find('[data-testid="co-requester-warning"]');
    expect(coReqWarning.exists()).toBe(true);
    expect(coReqWarning.text()).toContain('Warning: Co-requesters attached!');
    expect(coReqWarning.text()).toContain('@bob');

    // Confirm Delete
    await wrapper.find('[data-testid="confirm-delete-btn"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/library/delete', {
      requestIds: ['ep_1', 'ep_2'],
    });
    expect(showToastSpy).toHaveBeenCalledWith('Media deleted successfully!', 'success');
  });
});
