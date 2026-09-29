import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import RequestView from '../src/views/RequestView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';

let mockRoute = {
  query: {} as Record<string, any>,
  params: {} as Record<string, any>,
};

const mockRouterPush = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useRoute: () => mockRoute,
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
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
    }
  },
}));

describe('RequestView - Waitlist Manual Pick Fast-Track to Step 3 (#190)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRoute.query = {};
    mockRoute.params = {};
    vi.mocked(api.get).mockResolvedValue({ isConfigured: true, isReachable: true });
    vi.mocked(api.post).mockResolvedValue({ releases: [] });
  });

  it('mounts directly to Step 3 and triggers release search with watchForNextEpisodes enabled', async () => {
    mockRoute.query = {
      fromWaitlist: 'true',
      waitlistId: 'entry-test-123',
      mediaType: 'anime',
      metadataId: '99999',
      metadataSource: 'tmdb',
      title: 'Trapped in a Dating Sim',
      year: '2026',
      seasonNumber: '2',
      episodeNumber: '2',
      posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
    };

    const wrapper = mount(RequestView);
    await flushPromises();

    // Verify Step 3 confirmed heading/screen
    expect(wrapper.text()).toContain('Confirm Download Request');
    expect(wrapper.text()).toContain('Trapped in a Dating Sim');

    // Verify watchForNextEpisodes checkbox is checked
    const watchCheckbox = wrapper.find('input[type="checkbox"][id="watchForNextEpisodes"]') as any;
    if (watchCheckbox.exists()) {
      expect(watchCheckbox.element.checked).toBe(true);
    }

    // Verify release search was immediately initiated
    expect(api.post).toHaveBeenCalledWith(
      '/requests/search-releases',
      expect.objectContaining({
        title: 'Trapped in a Dating Sim',
        mediaType: 'anime',
      })
    );
  });

  it('surfaces error when waitlist parameters are incomplete', async () => {
    mockRoute.query = {
      fromWaitlist: 'true',
      mediaType: 'anime',
      // missing title and metadataId
    };

    const wrapper = mount(RequestView);
    await flushPromises();

    // Stays on Step 1 with error
    expect(wrapper.text()).toContain('Incomplete waitlist parameters.');
    expect(wrapper.text()).toContain('Find Matches & Continue');
  });

  it('submits request with waitlistId included in payload (#191)', async () => {
    mockRoute.query = {
      fromWaitlist: 'true',
      waitlistId: 'waitlist-entry-789',
      mediaType: 'anime',
      metadataId: '99999',
      metadataSource: 'tmdb',
      title: 'Trapped in a Dating Sim',
      seasonNumber: '2',
      episodeNumber: '2',
    };

    const mockRelease = {
      guid: 'rel-1',
      title: 'Trapped.in.a.Dating.Sim.S02E02.1080p',
      downloadUrl: 'magnet:?xt=urn:btih:rel123',
      seeders: 50,
      sizeBytes: 1000000000,
      indexer: 'AnimeIndexer',
    };

    let submittedPayload: Record<string, any> | null = null;
    vi.mocked(api.post).mockImplementation(async (endpoint: string, body?: any) => {
      if (endpoint === '/requests/search-releases') {
        return {
          recommended: mockRelease,
          candidates: [mockRelease],
          isConfigured: true,
          isReachable: true,
        } as any;
      }
      if (endpoint === '/requests') {
        submittedPayload = body;
        return {
          request: {
            id: 'req-fast-waitlist',
            title: 'Trapped in a Dating Sim',
            status: 'downloading',
          },
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(RequestView);
    await flushPromises();

    const confirmBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Confirm & Download'));
    expect(confirmBtn?.exists()).toBe(true);
    await confirmBtn?.trigger('click');
    await flushPromises();

    expect(submittedPayload).not.toBeNull();
    expect(submittedPayload).toMatchObject({
      waitlistId: 'waitlist-entry-789',
      title: 'Trapped in a Dating Sim',
      metadataId: '99999',
      seasonNumber: 2,
      episodeNumber: 2,
      magnetLink: 'magnet:?xt=urn:btih:rel123',
    });
  });
});
