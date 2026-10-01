import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ActiveStreamsShelf from '../src/components/ActiveStreamsShelf.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ActiveStreamsShelf.vue (#47 Stories 13, 14, 15)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders nothing when there are no active streams', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ streams: [] });

    const wrapper = mount(ActiveStreamsShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="active-streams-shelf"]').exists()).toBe(false);
  });

  it('renders active streams shelf with title, status badge, and TTL countdown', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      streams: [
        {
          id: 'stream-1',
          userId: 'user-1',
          debridTorrentId: 'rd-1',
          magnetLink: 'magnet:?xt=urn:btih:abc',
          title: 'Dune: Part Two 2024',
          status: 'ready',
          expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
          jellyfinItemId: 'jf-item-456',
          timeRemainingSeconds: 7200,
        },
        {
          id: 'stream-2',
          userId: 'user-2',
          debridTorrentId: 'rd-2',
          magnetLink: 'magnet:?xt=urn:btih:def',
          title: 'Shogun S01E01',
          status: 'pending',
          expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
          jellyfinItemId: null,
          timeRemainingSeconds: 1800,
        },
      ],
    });

    const wrapper = mount(ActiveStreamsShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="active-streams-shelf"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Active Ephemeral Streams');
    expect(wrapper.text()).toContain('Dune: Part Two 2024');
    expect(wrapper.text()).toContain('Shogun S01E01');
    expect(wrapper.text()).toContain('2h 0m left');
    expect(wrapper.text()).toContain('30m left');

    // Stream 1 is ready, so watch button exists
    const card1 = wrapper.find('[data-testid="stream-card-stream-1"]');
    expect(card1.find('[data-testid="button-watch-stream"]').exists()).toBe(true);
    expect(card1.find('[data-testid="button-watch-stream"]').attributes('href')).toBe(
      '/web/index.html#!/item?id=jf-item-456'
    );

    // Stream 2 is pending, so watch button does not exist
    const card2 = wrapper.find('[data-testid="stream-card-stream-2"]');
    expect(card2.find('[data-testid="button-watch-stream"]').exists()).toBe(false);
  });

  it('emits promote event when promote button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      streams: [
        {
          id: 'stream-1',
          userId: 'user-1',
          debridTorrentId: 'rd-1',
          magnetLink: 'magnet:?xt=urn:btih:abc',
          title: 'Dune: Part Two 2024',
          status: 'ready',
          expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
          jellyfinItemId: 'jf-item-456',
          timeRemainingSeconds: 7200,
        },
      ],
    });

    const wrapper = mount(ActiveStreamsShelf);
    await flushPromises();

    const promoteBtn = wrapper.find('[data-testid="button-promote-stream"]');
    await promoteBtn.trigger('click');

    expect(wrapper.emitted('promote')).toBeTruthy();
    expect(wrapper.emitted('promote')![0]).toEqual([{ id: 'stream-1', title: 'Dune: Part Two 2024' }]);
  });

  it('shows evict button only for admin and handles eviction', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'usr-1', username: 'admin', role: 'admin' };

    vi.mocked(api.get).mockResolvedValueOnce({
      streams: [
        {
          id: 'stream-1',
          userId: 'user-1',
          debridTorrentId: 'rd-1',
          magnetLink: 'magnet:?xt=urn:btih:abc',
          title: 'Dune: Part Two 2024',
          status: 'ready',
          expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
          jellyfinItemId: 'jf-item-456',
          timeRemainingSeconds: 7200,
        },
      ],
    });
    vi.mocked(api.delete).mockResolvedValueOnce({ success: true });

    // Mock confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const wrapper = mount(ActiveStreamsShelf);
    await flushPromises();

    const evictBtn = wrapper.find('[data-testid="button-evict-stream"]');
    expect(evictBtn.exists()).toBe(true);

    await evictBtn.trigger('click');
    await flushPromises();

    expect(api.delete).toHaveBeenCalledWith('/streams/stream-1');
    expect(wrapper.emitted('evicted')).toBeTruthy();
    expect(wrapper.emitted('evicted')![0]).toEqual(['stream-1']);
    // Card should be removed
    expect(wrapper.find('[data-testid="stream-card-stream-1"]').exists()).toBe(false);
  });

  it('hides evict button for non-admin users', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'usr-2', username: 'regular', role: 'user' };

    vi.mocked(api.get).mockResolvedValueOnce({
      streams: [
        {
          id: 'stream-1',
          userId: 'user-1',
          debridTorrentId: 'rd-1',
          magnetLink: 'magnet:?xt=urn:btih:abc',
          title: 'Dune: Part Two 2024',
          status: 'ready',
          expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
          jellyfinItemId: 'jf-item-456',
          timeRemainingSeconds: 7200,
        },
      ],
    });

    const wrapper = mount(ActiveStreamsShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="button-evict-stream"]').exists()).toBe(false);
  });

  it('renders party button on ready streams when watch_parties is enabled and opens modal', async () => {
    const { useFeatureFlags } = await import('../src/composables/useFeatureFlags');
    const ff = useFeatureFlags();
    ff.setFlag('watch_parties', true);

    vi.mocked(api.get).mockResolvedValueOnce({
      streams: [
        {
          id: 'stream-1',
          userId: 'user-1',
          debridTorrentId: 'rd-1',
          magnetLink: 'magnet:?xt=urn:btih:abc',
          title: 'Dune: Part Two 2024',
          status: 'ready',
          expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
          jellyfinItemId: 'jf-item-456',
          timeRemainingSeconds: 7200,
        },
      ],
    });

    const wrapper = mount(ActiveStreamsShelf);
    await flushPromises();

    const partyBtn = wrapper.find('[data-testid="button-party-stream"]');
    expect(partyBtn.exists()).toBe(true);
    expect(partyBtn.text()).toContain('Party');

    // Click party button
    await partyBtn.trigger('click');
    await flushPromises();

    // Modal should be open
    const modal = wrapper.find('[data-testid="create-watch-party-modal"]');
    expect(modal.exists()).toBe(true);
    expect(modal.text()).toContain('Dune: Part Two 2024');
  });

  it('hides party button when watch_parties is disabled', async () => {
    const { useFeatureFlags } = await import('../src/composables/useFeatureFlags');
    const ff = useFeatureFlags();
    ff.setFlag('watch_parties', false);

    vi.mocked(api.get).mockResolvedValueOnce({
      streams: [
        {
          id: 'stream-1',
          userId: 'user-1',
          debridTorrentId: 'rd-1',
          magnetLink: 'magnet:?xt=urn:btih:abc',
          title: 'Dune: Part Two 2024',
          status: 'ready',
          expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
          jellyfinItemId: 'jf-item-456',
          timeRemainingSeconds: 7200,
        },
      ],
    });

    const wrapper = mount(ActiveStreamsShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="button-party-stream"]').exists()).toBe(false);
  });

  it('handles watch party launch handoff and renders syncplay bridge modal', async () => {
    const { useFeatureFlags } = await import('../src/composables/useFeatureFlags');
    const ff = useFeatureFlags();
    ff.setFlag('watch_parties', true);

    const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    vi.mocked(api.get).mockResolvedValueOnce({
      streams: [
        {
          id: 'stream-1',
          userId: 'user-1',
          debridTorrentId: 'rd-1',
          magnetLink: 'magnet:?xt=urn:btih:abc',
          title: 'Dune: Part Two 2024',
          status: 'ready',
          expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
          jellyfinItemId: 'jf-item-456',
          timeRemainingSeconds: 7200,
        },
      ],
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      watchParty: {
        id: 'party-stream-1',
        hostUserId: 'user-1',
        hostUsername: 'alice',
        jellyfinGroupId: 'grp-1',
        jellyfinGroupName: '🎉 Watch Party: Dune: Part Two 2024',
        mediaType: 'movie',
        jellyfinItemId: 'jf-item-456',
        title: 'Dune: Part Two 2024',
        controlMode: 'everyone',
        status: 'active',
      },
    });

    const wrapper = mount(ActiveStreamsShelf);
    await flushPromises();

    // Open modal
    await wrapper.find('[data-testid="button-party-stream"]').trigger('click');
    await flushPromises();

    // Click Launch Party
    const launchBtn = wrapper.find('[data-testid="create-watch-party-modal"] button.bg-purple-600');
    await launchBtn.trigger('click');
    await flushPromises();

    // Window opened to Jellyfin details
    expect(windowSpy).toHaveBeenCalledWith('#!/details?id=jf-item-456', '_blank');

    // Bridge modal displayed
    expect(wrapper.find('[data-testid="syncplay-bridge-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('🎉 Watch Party: Dune: Part Two 2024');

    // Emitted partyCreated
    expect(wrapper.emitted('partyCreated')).toBeTruthy();

    windowSpy.mockRestore();
  });
});
