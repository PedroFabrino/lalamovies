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
    expect(launchLink.attributes('href')).toBe('#!/details?id=jf-100');
  });
});
