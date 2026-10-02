import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import PartyView from '../src/views/PartyView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';
import { useRequestsStore } from '../src/stores/requests';
import { useAuthStore } from '../src/stores/auth';
import { useFeatureFlags } from '../src/composables/useFeatureFlags';
import { router } from '../src/router';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../src/composables/useProgressSocket', () => ({
  useProgressSocket: () => ({
    isConnected: { value: true },
  }),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockRouteParamId = 'party-123';

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
    }),
    useRoute: () => ({
      params: { id: mockRouteParamId },
    }),
  };
});

describe('PartyView.vue (#215)', () => {
  const mockParty = {
    id: 'party-123',
    hostUserId: 'host-1',
    hostUsername: 'alice',
    jellyfinGroupId: 'grp-1',
    jellyfinGroupName: '🎉 Watch Party: Interstellar',
    mediaType: 'movie',
    jellyfinItemId: 'jf-item-1',
    title: 'Interstellar',
    controlMode: 'everyone' as const,
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    jellyfinWebUrl: 'https://watch.lalamovies.stream/web/index.html#!/details?id=jf-item-1',
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRouteParamId = 'party-123';
  });

  it('loads active party and opens WatchPartyLobbyModal', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ watchParty: mockParty });

    const wrapper = mount(PartyView, {
      global: {
        stubs: {
          WatchPartyLobbyModal: {
            props: ['open', 'party'],
            template: '<div v-if="open" data-testid="mock-lobby">{{ party?.title }}</div>',
          },
        },
      },
    });

    expect(wrapper.find('[data-testid="party-view-loading"]').exists()).toBe(true);

    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/watch-parties/party-123');
    expect(wrapper.find('[data-testid="mock-lobby"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Interstellar');
  });

  it('redirects to /dashboard with toast if party is not active or not found', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Party not found'));
    const requestsStore = useRequestsStore();
    const toastSpy = vi.spyOn(requestsStore, 'showToast');

    mount(PartyView, {
      global: {
        stubs: {
          WatchPartyLobbyModal: true,
        },
      },
    });

    await flushPromises();

    expect(toastSpy).toHaveBeenCalledWith(
      'This watch party has ended. You can start a new party from the dashboard.',
      'info',
    );
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard with toast if party status is ended', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      watchParty: { ...mockParty, status: 'ended' },
    });
    const requestsStore = useRequestsStore();
    const toastSpy = vi.spyOn(requestsStore, 'showToast');

    mount(PartyView, {
      global: {
        stubs: {
          WatchPartyLobbyModal: true,
        },
      },
    });

    await flushPromises();

    expect(toastSpy).toHaveBeenCalledWith(
      'This watch party has ended. You can start a new party from the dashboard.',
      'info',
    );
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to /dashboard when user closes lobby modal', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ watchParty: mockParty });

    const wrapper = mount(PartyView, {
      global: {
        stubs: {
          WatchPartyLobbyModal: {
            props: ['open', 'party'],
            emits: ['close'],
            template: '<button data-testid="close-btn" @click="$emit(\'close\')">Close</button>',
          },
        },
      },
    });

    await flushPromises();

    await wrapper.find('[data-testid="close-btn"]').trigger('click');

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('handles websocket watch_party_ended event by redirecting with toast', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ watchParty: mockParty });
    const requestsStore = useRequestsStore();
    const toastSpy = vi.spyOn(requestsStore, 'showToast');

    mount(PartyView, {
      global: {
        stubs: {
          WatchPartyLobbyModal: true,
        },
      },
    });

    await flushPromises();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'watch_party_ended', partyId: 'party-123' }),
      }),
    );

    expect(toastSpy).toHaveBeenCalledWith(
      'This watch party has ended. You can start a new party from the dashboard.',
      'info',
    );
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});

describe('Router Guard & Deep Link Navigation (#215)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const ff = useFeatureFlags();
    ff.setFlags({
      watch_parties: true,
    });
  });

  it('redirects unauthenticated users from /party/:id to login with redirect param', async () => {
    const authStore = useAuthStore();
    authStore.user = null;
    authStore.initialCheckDone = true;

    await router.push('/party/room-abc');

    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe('/party/room-abc');
  });
});
