import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DashboardView from '../src/views/DashboardView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';
import { useRequestsStore } from '../src/stores/requests';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
}));

vi.mock('../src/components/Navbar.vue', () => ({
  default: { template: '<div data-testid="mock-navbar"></div>' },
}));

vi.mock('../src/components/UpNextShelf.vue', () => ({
  default: { template: '<div data-testid="mock-up-next"></div>' },
}));

vi.mock('../src/components/DiscoveryFeed.vue', () => ({
  default: { template: '<div data-testid="mock-discovery-feed"></div>' },
}));

vi.mock('../src/components/ActiveStreamsShelf.vue', () => ({
  default: { template: '<div data-testid="mock-active-streams"></div>' },
}));

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
    }
  },
}));

describe('DashboardView - Subtitle Transcription Badges & Manual Trigger (Subtask #103)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders subtitle status badges correctly across all states', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'usr_trusted_1', username: 'trusted_user', role: 'trusted', jellyfinUserId: 'jf_1' };

    const mockRequests = [
      {
        id: 'req_pending',
        userId: 'usr_trusted_1',
        title: 'Pending Movie',
        mediaType: 'private',
        status: 'seeding',
        metadataId: '1',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
        transcriptionStatus: 'pending',
      },
      {
        id: 'req_transcribing',
        userId: 'usr_trusted_1',
        title: 'Transcribing Movie',
        mediaType: 'private',
        status: 'seeding',
        metadataId: '2',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
        transcriptionStatus: 'transcribing',
      },
      {
        id: 'req_completed',
        userId: 'usr_trusted_1',
        title: 'Completed Movie',
        mediaType: 'private',
        status: 'seeding',
        metadataId: '3',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
        transcriptionStatus: 'completed',
      },
      {
        id: 'req_failed',
        userId: 'usr_trusted_1',
        title: 'Failed Movie',
        mediaType: 'private',
        status: 'seeding',
        metadataId: '4',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
        transcriptionStatus: 'failed',
        transcriptionError: 'CUDA Out of Memory',
      },
    ];

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/requests') {
        return { requests: mockRequests };
      }
      return {};
    });

    const wrapper = mount(DashboardView, {
      global: {
        stubs: { 'router-link': true },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Pending Window');
    expect(wrapper.text()).toContain('Transcribing...');
    expect(wrapper.text()).toContain('Subtitles Ready');
    expect(wrapper.text()).toContain('Transcription Failed');

    // Tooltip check for failed state
    const failedBadge = wrapper.find('[title="CUDA Out of Memory"]');
    expect(failedBadge.exists()).toBe(true);
  });

  it('allows trusted owner to click Generate Subtitles and calls POST /requests/:id/transcribe', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'usr_trusted_1', username: 'trusted_user', role: 'trusted', jellyfinUserId: 'jf_1' };

    const mockRequest = {
      id: 'req_to_transcribe',
      userId: 'usr_trusted_1',
      title: 'Movie To Transcribe',
      mediaType: 'private',
      status: 'seeding',
      metadataId: '10',
      metadataSource: 'tmdb',
      requestedAt: new Date().toISOString(),
      transcriptionStatus: 'none',
    };

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/requests') {
        return { requests: [mockRequest] };
      }
      return {};
    });

    vi.mocked(api.post).mockResolvedValue({
      request: {
        ...mockRequest,
        transcriptionStatus: 'pending',
      },
    });

    const wrapper = mount(DashboardView, {
      global: {
        stubs: { 'router-link': true },
      },
    });

    await flushPromises();

    const transcribeButton = wrapper.findAll('button').find((b) => b.text().includes('Generate Subtitles'));
    expect(transcribeButton).toBeDefined();

    await transcribeButton!.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/requests/req_to_transcribe/transcribe');
    const store = useRequestsStore();
    const updated = store.requests.find((r) => r.id === 'req_to_transcribe');
    expect(updated?.transcriptionStatus).toBe('pending');
  });

  it('shows Retry Subtitles button when transcriptionStatus is failed', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'usr_trusted_1', username: 'trusted_user', role: 'trusted', jellyfinUserId: 'jf_1' };

    const mockRequest = {
      id: 'req_failed_retry',
      userId: 'usr_trusted_1',
      title: 'Retry Movie',
      mediaType: 'private',
      status: 'seeding',
      metadataId: '11',
      metadataSource: 'tmdb',
      requestedAt: new Date().toISOString(),
      transcriptionStatus: 'failed',
      transcriptionError: 'Timeout',
    };

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/requests') {
        return { requests: [mockRequest] };
      }
      return {};
    });

    const wrapper = mount(DashboardView, {
      global: {
        stubs: { 'router-link': true },
      },
    });

    await flushPromises();

    const retryButton = wrapper.findAll('button').find((b) => b.text().includes('Retry Subtitles'));
    expect(retryButton).toBeDefined();
  });
});
