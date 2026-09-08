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

describe('RequestView - Fast-Track Deep-Linking to Step 3', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRoute.query = {};
    mockRoute.params = {};
    vi.mocked(api.get).mockResolvedValue({ isConfigured: true, isReachable: true });
  });

  it('mounts directly to Step 3 and displays pre-selected candidate for valid movie deep-link', async () => {
    mockRoute.query = {
      title: 'Inception',
      metadataId: '27205',
      metadataSource: 'tmdb',
      mediaType: 'movie',
      year: '2010',
      downloadUrl: 'magnet:?xt=urn:btih:mockinceptionhash',
      releaseTitle: 'Inception.2010.1080p.BluRay.x264',
      resolution: '1080p',
      seeders: '42',
      indexer: '1337x',
      sizeBytes: '2147483648',
    };

    let submittedPayload: Record<string, any> | null = null;
    vi.mocked(api.post).mockImplementation(async (endpoint: string, body?: any) => {
      if (endpoint === '/requests') {
        submittedPayload = body;
        return {
          request: {
            id: 'req-fast-1',
            title: 'Inception',
            status: 'downloading',
          },
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(RequestView);
    await flushPromises();

    // Verify Step 3 is mounted directly
    expect(wrapper.text()).toContain('Confirm Download Request');
    expect(wrapper.text()).toContain('Inception');
    expect(wrapper.text()).toContain('2010');
    expect(wrapper.text()).toContain('Inception.2010.1080p.BluRay.x264');
    expect(wrapper.text()).toContain('42 seeders');
    expect(wrapper.text()).toContain('1337x');

    // Click confirm button
    const confirmBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Confirm & Download'));
    expect(confirmBtn?.exists()).toBe(true);
    await confirmBtn?.trigger('click');
    await flushPromises();

    // Verify submission payload
    expect(submittedPayload).not.toBeNull();
    expect(submittedPayload).toMatchObject({
      title: 'Inception',
      metadataId: '27205',
      metadataSource: 'tmdb',
      mediaType: 'movie',
      year: 2010,
      magnetLink: 'magnet:?xt=urn:btih:mockinceptionhash',
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
  });

  it('mounts directly to Step 3 with episodic series parameters (season & episode)', async () => {
    mockRoute.query = {
      title: 'Breaking Bad',
      metadataId: '1396',
      metadataSource: 'tmdb',
      mediaType: 'tv_show',
      seasonNumber: '2',
      episodeNumber: '5',
      downloadUrl: 'magnet:?xt=urn:btih:mockbbhash',
      releaseTitle: 'Breaking.Bad.S02E05.1080p.BluRay',
      resolution: '1080p',
      seeders: '25',
    };

    let submittedPayload: Record<string, any> | null = null;
    vi.mocked(api.post).mockImplementation(async (endpoint: string, body?: any) => {
      if (endpoint === '/requests') {
        submittedPayload = body;
        return {
          request: { id: 'req-tv-1', title: 'Breaking Bad', status: 'downloading' },
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(RequestView);
    await flushPromises();

    expect(wrapper.text()).toContain('Confirm Download Request');
    expect(wrapper.text()).toContain('Breaking Bad');
    expect(wrapper.text()).toContain('Breaking.Bad.S02E05.1080p.BluRay');

    const confirmBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Confirm & Download'));
    await confirmBtn?.trigger('click');
    await flushPromises();

    expect(submittedPayload).toMatchObject({
      title: 'Breaking Bad',
      mediaType: 'tv_show',
      seasonNumber: 2,
      episodeNumber: 5,
      magnetLink: 'magnet:?xt=urn:btih:mockbbhash',
    });
  });

  it('gracefully falls back to Step 1 search mode when required parameters are missing', async () => {
    // Missing downloadUrl and metadataId
    mockRoute.query = {
      title: 'Incomplete Movie',
    };

    const wrapper = mount(RequestView);
    await flushPromises();

    // Should stay on Step 1, not crash
    expect(wrapper.text()).toContain('New Download Request');
    expect(wrapper.text()).toContain('Find Matches & Continue');
    expect(wrapper.text()).not.toContain('Confirm Download Request');
  });
});
