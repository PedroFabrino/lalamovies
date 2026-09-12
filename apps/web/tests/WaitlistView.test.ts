import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import WaitlistView from '../src/views/WaitlistView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';

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

describe('WaitlistView - Dedicated Waitlist Page', () => {
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

  it('renders list of waitlist entries with title, year, badges, and lifecycle states', async () => {
    const mockEntries = [
      {
        id: 'entry-1',
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '101',
        metadataSource: 'tmdb',
        title: 'Beyond the Spider-Verse',
        year: 2026,
        status: 'pending_release',
        tmdbReleaseDate: '2026-06-15',
        posterUrl: 'https://image.tmdb.org/t/p/w500/spider.jpg',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'entry-2',
        userId: 'user-1',
        mediaType: 'tv_show',
        metadataId: '102',
        metadataSource: 'tmdb',
        title: 'Severance',
        year: 2022,
        seasonNumber: 2,
        targetEpisode: 1,
        status: 'checking',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'entry-3',
        userId: 'user-1',
        mediaType: 'anime',
        metadataId: '103',
        metadataSource: 'tmdb',
        title: 'Chainsaw Man',
        year: 2022,
        seasonNumber: 2,
        status: 'notified',
        notifyAt: new Date().toISOString(),
        prowlarrReleaseTitle: 'Chainsaw.Man.S02.1080p.CR.WEB-DL',
        createdAt: '2026-01-03T00:00:00.000Z',
      },
      {
        id: 'entry-4',
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '104',
        metadataSource: 'tmdb',
        title: 'Dune: Part Two',
        year: 2024,
        status: 'triggered',
        createdAt: '2026-01-04T00:00:00.000Z',
      },
      {
        id: 'entry-5',
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '105',
        metadataSource: 'tmdb',
        title: 'Oppenheimer',
        year: 2023,
        status: 'completed',
        createdAt: '2026-01-05T00:00:00.000Z',
      },
    ];

    vi.mocked(api.get).mockResolvedValue({ entries: mockEntries } as any);

    const wrapper = mount(WaitlistView);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/waitlist');

    const cards = wrapper.findAll('[data-testid="waitlist-card"]');
    expect(cards.length).toBe(5);

    // First card: Beyond the Spider-Verse
    expect(cards[0].text()).toContain('Beyond the Spider-Verse');
    expect(cards[0].text()).toContain('2026');
    expect(cards[0].find('[data-testid="entry-media-type"]').text()).toContain('Movie');
    expect(cards[0].find('[data-testid="entry-status-badge"]').text()).toContain('Pending Release');
    expect(cards[0].find('[data-testid="entry-release-date-badge"]').exists()).toBe(true);
    expect(cards[0].text()).toContain('Starts searching trackers on');

    // Second card: Severance S02E01
    expect(cards[1].text()).toContain('Severance');
    expect(cards[1].find('[data-testid="entry-season-badge"]').text()).toContain('S02E01');
    expect(cards[1].find('[data-testid="entry-status-badge"]').text()).toContain('Checking Trackers');

    // Third card: Chainsaw Man S02 - Notified with countdown
    expect(cards[2].text()).toContain('Chainsaw Man');
    expect(cards[2].find('[data-testid="entry-status-badge"]').text()).toContain('Release Found');
    expect(cards[2].text()).toContain('Auto-downloading in');

    // Fourth card: Triggered
    expect(cards[3].find('[data-testid="entry-status-badge"]').text()).toContain('Triggered');

    // Fifth card: Completed
    expect(cards[4].find('[data-testid="entry-status-badge"]').text()).toContain('Completed');
  });

  it('cancels entry optimistically on Cancel click', async () => {
    const mockEntries = [
      {
        id: 'entry-to-cancel',
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '202',
        metadataSource: 'tmdb',
        title: 'Gladiator II',
        year: 2024,
        status: 'checking',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    vi.mocked(api.get).mockResolvedValue({ entries: mockEntries } as any);
    vi.mocked(api.delete).mockResolvedValue({ ok: true } as any);

    const wrapper = mount(WaitlistView);
    await flushPromises();

    expect(wrapper.findAll('[data-testid="waitlist-card"]').length).toBe(1);

    const cancelBtn = wrapper.find('[data-testid="cancel-waitlist-btn"]');
    expect(cancelBtn.exists()).toBe(true);

    await cancelBtn.trigger('click');
    await flushPromises();

    // Verify optimistic removal
    expect(wrapper.findAll('[data-testid="waitlist-card"]').length).toBe(0);
    expect(wrapper.find('[data-testid="waitlist-empty-state"]').exists()).toBe(true);
    expect(api.delete).toHaveBeenCalledWith('/waitlist/entry-to-cancel');
  });

  it('opens search modal, queries TMDB, selects candidate, and confirms entry creation', async () => {
    vi.mocked(api.get).mockResolvedValue({ entries: [] } as any);
    vi.mocked(api.post).mockImplementation(async (endpoint: string, body?: any) => {
      if (endpoint === '/requests/search-metadata') {
        return {
          candidates: [
            {
              id: 'tmdb-the-boys-5',
              source: 'tmdb',
              title: 'The Boys',
              year: 2026,
              overview: 'The final season of The Boys...',
              posterUrl: 'https://image.tmdb.org/t/p/w500/theboys.jpg',
            },
          ],
        } as any;
      }
      if (endpoint === '/waitlist') {
        return {
          entry: {
            id: 'new-entry-1',
            userId: 'user-1',
            mediaType: body.mediaType,
            metadataId: body.metadataId,
            metadataSource: body.metadataSource,
            title: body.title,
            year: body.year,
            seasonNumber: body.seasonNumber,
            status: 'pending_release',
            posterUrl: body.posterUrl,
            createdAt: new Date().toISOString(),
          },
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(WaitlistView);
    await flushPromises();

    // Click "Add to Waitlist"
    const openBtn = wrapper.find('[data-testid="open-add-waitlist-modal"]');
    await openBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="waitlist-modal"]').exists()).toBe(true);

    // Switch media type to tv_show
    const tvShowRadio = wrapper.find('input[name="modalMediaType"][value="tv_show"]');
    await tvShowRadio.setValue();

    // Search query
    const searchInput = wrapper.find('[data-testid="search-waitlist-input"]');
    await searchInput.setValue('The Boys');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/requests/search-metadata', {
      query: 'The Boys',
      mediaType: 'tv_show',
    });

    // Select candidate
    const candidateItem = wrapper.find('[data-testid="search-candidate-item"]');
    expect(candidateItem.exists()).toBe(true);
    await candidateItem.trigger('click');
    await flushPromises();

    // Confirm step
    expect(wrapper.find('[data-testid="confirm-candidate-title"]').text()).toContain('The Boys');

    // Specify Season Number: 5
    const seasonInput = wrapper.find('[data-testid="waitlist-season-input"]');
    expect(seasonInput.exists()).toBe(true);
    await seasonInput.setValue(5);

    // Confirm add
    const confirmBtn = wrapper.find('[data-testid="confirm-add-waitlist-btn"]');
    await confirmBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/waitlist', {
      mediaType: 'tv_show',
      metadataId: 'tmdb-the-boys-5',
      metadataSource: 'tmdb',
      title: 'The Boys',
      year: 2026,
      seasonNumber: 5,
      targetEpisode: 1,
      posterUrl: 'https://image.tmdb.org/t/p/w500/theboys.jpg',
    });

    // Modal closes and entry is listed
    expect(wrapper.find('[data-testid="waitlist-modal"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="waitlist-card"]').length).toBe(1);
    expect(wrapper.text()).toContain('The Boys');
  });

  it('opens confirmation modal directly when mounted with pre-filled query params from RequestView', async () => {
    mockRouteQuery = {
      add: 'true',
      title: 'Avatar 3',
      year: '2025',
      metadataId: '9999',
      metadataSource: 'tmdb',
      mediaType: 'movie',
      posterUrl: 'https://image.tmdb.org/t/p/w500/avatar3.jpg',
    };

    vi.mocked(api.get).mockResolvedValue({ entries: [] } as any);
    vi.mocked(api.post).mockResolvedValue({
      entry: {
        id: 'prefill-entry-1',
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '9999',
        metadataSource: 'tmdb',
        title: 'Avatar 3',
        year: 2025,
        status: 'pending_release',
        posterUrl: 'https://image.tmdb.org/t/p/w500/avatar3.jpg',
        createdAt: new Date().toISOString(),
      },
    } as any);

    const wrapper = mount(WaitlistView);
    await flushPromises();

    // Modal should be open directly in confirm step
    expect(wrapper.find('[data-testid="waitlist-modal"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="confirm-candidate-title"]').text()).toContain('Avatar 3');

    // Confirm submission
    const confirmBtn = wrapper.find('[data-testid="confirm-add-waitlist-btn"]');
    await confirmBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/waitlist', {
      mediaType: 'movie',
      metadataId: '9999',
      metadataSource: 'tmdb',
      title: 'Avatar 3',
      year: 2025,
      seasonNumber: undefined,
      posterUrl: 'https://image.tmdb.org/t/p/w500/avatar3.jpg',
    });

    // Toast alert shown
    expect(wrapper.find('[data-testid="waitlist-toast"]').text()).toContain('Added "Avatar 3" to waitlist');
    expect(mockRouterReplace).toHaveBeenCalledWith({ path: '/waitlist', query: {} });
  });

  it('shows admin toggle when user is admin and switches between All Users and My Entries', async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 'admin-1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
    };

    vi.mocked(api.get).mockResolvedValue({ entries: [] } as any);

    const wrapper = mount(WaitlistView);
    await flushPromises();

    // Admin view toggle exists
    expect(wrapper.find('[data-testid="admin-view-toggle"]').exists()).toBe(true);

    // Initial fetch for admin is all users (/waitlist)
    expect(api.get).toHaveBeenCalledWith('/waitlist');

    // Click "My Entries"
    const mineBtn = wrapper.find('[data-testid="toggle-view-mine"]');
    await mineBtn.trigger('click');
    await flushPromises();

    // Fetches with userId filter
    expect(api.get).toHaveBeenCalledWith('/waitlist?userId=admin-1');

    // Click "All Users"
    const allBtn = wrapper.find('[data-testid="toggle-view-all"]');
    await allBtn.trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/waitlist');
  });

  it('displays requester username badge and allows admin to cancel other users entries', async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 'admin-1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
    };

    const mockEntries = [
      {
        id: 'entry-bob',
        userId: 'user-bob',
        requesterUsername: 'bob',
        mediaType: 'movie',
        metadataId: '300',
        metadataSource: 'tmdb',
        title: 'Interstellar 2',
        year: 2026,
        status: 'checking',
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(api.get).mockResolvedValue({ entries: mockEntries } as any);
    vi.mocked(api.delete).mockResolvedValue({ ok: true } as any);

    const wrapper = mount(WaitlistView);
    await flushPromises();

    // Verify requester badge is displayed
    const requesterBadge = wrapper.find('[data-testid="entry-requester"]');
    expect(requesterBadge.exists()).toBe(true);
    expect(requesterBadge.text()).toContain('bob');

    // Admin cancels bob's entry
    const cancelBtn = wrapper.find('[data-testid="cancel-waitlist-btn"]');
    expect(cancelBtn.exists()).toBe(true);
    await cancelBtn.trigger('click');
    await flushPromises();

    expect(api.delete).toHaveBeenCalledWith('/waitlist/entry-bob');
    expect(wrapper.findAll('[data-testid="waitlist-card"]').length).toBe(0);
  });

  it('auto-detects next episode from series-progress, displays air date, and passes tmdbReleaseDate to API', async () => {
    vi.mocked(api.get).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/waitlist') {
        return { entries: [] } as any;
      }
      if (endpoint.startsWith('/requests/series-progress')) {
        return {
          highestSeason: 3,
          highestEpisode: 6,
          existingEpisodes: [1, 2, 3, 4, 5, 6],
          suggestedSeason: 3,
          suggestedEpisode: 7,
          existingTitle: 'Lioness',
          hasExisting: true,
          airDate: '2026-09-13',
        } as any;
      }
      return {} as any;
    });

    vi.mocked(api.post).mockImplementation(async (endpoint: string, body?: any) => {
      if (endpoint === '/requests/search-metadata') {
        return {
          candidates: [
            {
              id: '113962',
              source: 'tmdb',
              title: 'Lioness',
              year: 2023,
              overview: 'CIA operative Joe...',
              posterUrl: 'https://image.tmdb.org/t/p/w500/lioness.jpg',
            },
          ],
        } as any;
      }
      if (endpoint === '/waitlist') {
        return {
          entry: {
            id: 'lioness-entry',
            userId: 'user-1',
            ...body,
            status: 'pending_release',
            createdAt: new Date().toISOString(),
          },
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(WaitlistView);
    await flushPromises();

    // Open modal
    await wrapper.find('[data-testid="open-add-waitlist-modal"]').trigger('click');
    await flushPromises();

    // Search Lioness as tv_show
    const tvShowRadio = wrapper.find('input[name="modalMediaType"][value="tv_show"]');
    await tvShowRadio.setValue();

    const searchInput = wrapper.find('[data-testid="search-waitlist-input"]');
    await searchInput.setValue('Lioness');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // Select candidate
    await wrapper.find('[data-testid="search-candidate-item"]').trigger('click');
    await flushPromises();

    // Verify series progress badge auto-targets episode 7
    expect(wrapper.find('[data-testid="series-progress-badge"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="series-progress-badge"]').text()).toContain('Auto-targeting next episode 7');

    const epInput = wrapper.find('[data-testid="waitlist-episode-input"]');
    expect((epInput.element as HTMLInputElement).value).toBe('7');

    // Verify air date info is displayed
    const airDateInfo = wrapper.find('[data-testid="confirm-air-date-info"]');
    expect(airDateInfo.exists()).toBe(true);
    expect(airDateInfo.text()).toContain('Episode Air Date:');

    // Confirm submission
    await wrapper.find('[data-testid="confirm-add-waitlist-btn"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/waitlist', {
      mediaType: 'tv_show',
      metadataId: '113962',
      metadataSource: 'tmdb',
      title: 'Lioness',
      year: 2023,
      seasonNumber: 1,
      targetEpisode: 7,
      tmdbReleaseDate: '2026-09-13',
      posterUrl: 'https://image.tmdb.org/t/p/w500/lioness.jpg',
    });
  });

  it('renders Approve Now button for notified releases and triggers immediate download approval', async () => {
    const mockEntries = [
      {
        id: 'entry-notified-lioness',
        userId: 'user-1',
        mediaType: 'tv_show',
        metadataId: '113962',
        metadataSource: 'tmdb',
        title: 'Lioness',
        year: 2023,
        seasonNumber: 3,
        targetEpisode: 7,
        status: 'notified',
        notifyAt: new Date().toISOString(),
        prowlarrReleaseTitle: 'Lioness 2023 S03E07 1080p HD',
        createdAt: '2026-09-12T00:00:00.000Z',
      },
    ];

    vi.mocked(api.get).mockResolvedValue({ entries: mockEntries } as any);
    vi.mocked(api.post).mockResolvedValue({ ok: true } as any);

    const wrapper = mount(WaitlistView);
    await flushPromises();

    const approveBtn = wrapper.find('[data-testid="approve-waitlist-btn"]');
    expect(approveBtn.exists()).toBe(true);
    expect(approveBtn.text()).toContain('Approve Now');

    await approveBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/waitlist/entry-notified-lioness/approve');
  });
});

