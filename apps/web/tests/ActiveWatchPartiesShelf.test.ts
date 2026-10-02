import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ActiveWatchPartiesShelf from '../src/components/ActiveWatchPartiesShelf.vue';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ActiveWatchPartiesShelf.vue (#204)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there are no active watch parties', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ watchParties: [] });

    const wrapper = mount(ActiveWatchPartiesShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="active-watch-parties-shelf"]').exists()).toBe(false);
  });

  it('renders active parties shelf with title, host, control mode, and join button', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      watchParties: [
        {
          id: 'party-1',
          hostUserId: 'user-1',
          hostUsername: 'alice',
          jellyfinGroupId: 'group-1',
          jellyfinGroupName: '🎉 Watch Party: Spirited Away (2001)',
          mediaType: 'movie',
          jellyfinItemId: 'jf-100',
          title: 'Spirited Away',
          year: 2001,
          posterUrl: 'https://image.tmdb.org/t/p/w500/spirited.jpg',
          controlMode: 'everyone',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const wrapper = mount(ActiveWatchPartiesShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="active-watch-parties-shelf"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Spirited Away');
    expect(wrapper.text()).toContain('alice');
    expect(wrapper.text()).toContain('Democratic');

    const card = wrapper.find('[data-testid="party-card-party-1"]');
    expect(card.exists()).toBe(true);

    const joinBtn = card.find('button');
    expect(joinBtn.text()).toContain('Join Party');
  });

  it('opens SyncPlay bridge modal when clicking Join Party', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      watchParties: [
        {
          id: 'party-1',
          hostUserId: 'user-1',
          hostUsername: 'alice',
          jellyfinGroupId: 'group-1',
          jellyfinGroupName: '🎉 Watch Party: Spirited Away (2001)',
          mediaType: 'movie',
          jellyfinItemId: 'jf-100',
          title: 'Spirited Away',
          year: 2001,
          controlMode: 'everyone',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const wrapper = mount(ActiveWatchPartiesShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="syncplay-bridge-modal"]').exists()).toBe(false);

    const joinBtn = wrapper.find('[data-testid="party-card-party-1"] button');
    await joinBtn.trigger('click');

    const modal = wrapper.find('[data-testid="syncplay-bridge-modal"]');
    expect(modal.exists()).toBe(true);
    expect(modal.text()).toContain('Connect to SyncPlay');
    expect(modal.text()).toContain('🎉 Watch Party: Spirited Away (2001)');

    const launchLink = modal.find('a');
    expect(launchLink.attributes('href')).toBe('https://watch.lalamovies.stream/web/index.html#!/details?id=jf-100');
  });

  it('renders empty-state banner when no parties exist and watch_parties is enabled', async () => {
    const { useFeatureFlags } = await import('../src/composables/useFeatureFlags');
    const ff = useFeatureFlags();
    ff.setFlag('watch_parties', true);

    vi.mocked(api.get).mockResolvedValueOnce({ watchParties: [] });

    const wrapper = mount(ActiveWatchPartiesShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="active-watch-parties-shelf"]').exists()).toBe(false);
    const banner = wrapper.find('[data-testid="watch-parties-empty-banner"]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain('Watch Parties');
    expect(banner.find('[data-testid="button-host-party-banner"]').exists()).toBe(true);
  });

  it('hides empty-state banner when watch_parties is disabled', async () => {
    const { useFeatureFlags } = await import('../src/composables/useFeatureFlags');
    const ff = useFeatureFlags();
    ff.setFlag('watch_parties', false);

    vi.mocked(api.get).mockResolvedValueOnce({ watchParties: [] });

    const wrapper = mount(ActiveWatchPartiesShelf);
    await flushPromises();

    expect(wrapper.find('[data-testid="watch-parties-empty-banner"]').exists()).toBe(false);
  });

  it('opens CreateWatchPartyModal from empty banner and handles creation handoff', async () => {
    const { useFeatureFlags } = await import('../src/composables/useFeatureFlags');
    const ff = useFeatureFlags();
    ff.setFlag('watch_parties', true);

    const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/watch-parties') return Promise.resolve({ watchParties: [] });
      if (url === '/streams') return Promise.resolve({ streams: [] });
      if (url === '/requests') return Promise.resolve({ requests: [] });
      return Promise.resolve({});
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      watchParty: {
        id: 'new-party-banner',
        hostUserId: 'user-1',
        hostUsername: 'alice',
        jellyfinGroupId: 'grp-2',
        jellyfinGroupName: '🎉 Watch Party: Princess Mononoke',
        mediaType: 'movie',
        jellyfinItemId: 'jf-item-99',
        title: 'Princess Mononoke',
        controlMode: 'everyone',
        status: 'active',
      },
    });

    const wrapper = mount(ActiveWatchPartiesShelf);
    await flushPromises();

    // Click Host Party banner button
    await wrapper.find('[data-testid="button-host-party-banner"]').trigger('click');
    await flushPromises();

    // Creation modal is visible
    expect(wrapper.find('[data-testid="create-watch-party-modal"]').exists()).toBe(true);

    // Toggle manual entry and fill
    await wrapper.find('[data-testid="toggle-manual-entry"]').trigger('click');
    await wrapper.find('[data-testid="manual-title-input"]').setValue('Princess Mononoke');
    await wrapper.find('[data-testid="manual-item-id-input"]').setValue('jf-item-99');

    // Click Launch Party
    const launchBtn = wrapper.find('[data-testid="create-watch-party-modal"] button.bg-purple-600');
    await launchBtn.trigger('click');
    await flushPromises();

    // Verified Jellyfin window opened
    expect(windowSpy).toHaveBeenCalledWith('https://watch.lalamovies.stream/web/index.html#!/details?id=jf-item-99', '_blank');

    // Verified bridge modal opened
    expect(wrapper.find('[data-testid="syncplay-bridge-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('🎉 Watch Party: Princess Mononoke');

    windowSpy.mockRestore();
  });

  it('renders + Host Party button in shelf header when parties exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      watchParties: [
        {
          id: 'party-1',
          hostUserId: 'user-1',
          hostUsername: 'alice',
          jellyfinGroupId: 'group-1',
          jellyfinGroupName: '🎉 Watch Party: Spirited Away (2001)',
          mediaType: 'movie',
          jellyfinItemId: 'jf-100',
          title: 'Spirited Away',
          year: 2001,
          controlMode: 'everyone',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const wrapper = mount(ActiveWatchPartiesShelf);
    await flushPromises();

    const hostHeaderBtn = wrapper.find('[data-testid="button-host-party-header"]');
    expect(hostHeaderBtn.exists()).toBe(true);
    expect(hostHeaderBtn.text()).toContain('Host Party');

    await hostHeaderBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="create-watch-party-modal"]').exists()).toBe(true);
  });
});
