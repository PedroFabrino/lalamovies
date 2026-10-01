import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import WatchPartyLobbyModal from '../src/components/WatchPartyLobbyModal.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';

vi.mock('../src/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('WatchPartyLobbyModal.vue (#205)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const baseParty = {
    id: 'party-999',
    hostUserId: 'host-1',
    hostUsername: 'alice',
    jellyfinGroupId: 'group-1',
    jellyfinGroupName: '🎉 Watch Party: Frieren S01E01',
    mediaType: 'anime',
    jellyfinItemId: 'jf-item-1',
    title: 'Frieren: Beyond Journey\'s End',
    seasonNumber: 1,
    episodeNumber: 1,
    controlMode: 'everyone' as const,
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    historyJson: JSON.stringify([
      {
        title: 'Frieren: Beyond Journey\'s End',
        seasonNumber: 1,
        episodeNumber: 0,
        completedAt: new Date().toISOString(),
      },
    ]),
  };

  it('renders lobby modal with party info, current episode, and timeline history', () => {
    const wrapper = mount(WatchPartyLobbyModal, {
      props: {
        open: true,
        party: baseParty,
      },
    });

    expect(wrapper.find('[data-testid="watch-party-lobby-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Frieren');
    expect(wrapper.text()).toContain('alice');
    expect(wrapper.text()).toContain('Party Timeline');
  });

  it('hides host controls when logged-in user is not the host', () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'viewer-2', username: 'bob', role: 'user', jellyfinUserId: 'jf-bob' };

    const wrapper = mount(WatchPartyLobbyModal, {
      props: {
        open: true,
        party: baseParty,
      },
    });

    expect(wrapper.find('[data-testid="host-controls"]').exists()).toBe(false);
  });

  it('shows host controls and plays next episode when clicked by host', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'host-1', username: 'alice', role: 'user', jellyfinUserId: 'jf-alice' };

    vi.mocked(api.post).mockResolvedValueOnce({
      watchParty: {
        ...baseParty,
        episodeNumber: 2,
      },
    });

    const wrapper = mount(WatchPartyLobbyModal, {
      props: {
        open: true,
        party: baseParty,
      },
    });

    expect(wrapper.find('[data-testid="host-controls"]').exists()).toBe(true);

    const nextBtn = wrapper.find('[data-testid="play-next-episode-btn"]');
    expect(nextBtn.exists()).toBe(true);
    expect(nextBtn.text()).toContain('Play Next Episode (E2)');

    await nextBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/watch-parties/party-999/switch-media', {
      jellyfinItemId: 'jf-item-1',
      title: 'Frieren: Beyond Journey\'s End',
      mediaType: 'anime',
      seasonNumber: 1,
      episodeNumber: 2,
      posterUrl: undefined,
    });

    expect(wrapper.emitted('mediaSwitched')).toBeTruthy();
  });
});
