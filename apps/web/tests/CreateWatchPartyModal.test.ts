import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CreateWatchPartyModal from '../src/components/CreateWatchPartyModal.vue';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('CreateWatchPartyModal.vue (#204)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockItem = {
    title: 'Princess Mononoke',
    jellyfinItemId: 'jf-item-555',
    mediaType: 'movie',
    year: 1997,
    posterUrl: 'https://image.tmdb.org/t/p/w500/mononoke.jpg',
  };

  it('renders nothing when closed', () => {
    const wrapper = mount(CreateWatchPartyModal, {
      props: {
        open: false,
        item: mockItem,
      },
    });

    expect(wrapper.find('[data-testid="create-watch-party-modal"]').exists()).toBe(false);
  });

  it('renders modal with item info and default democratic policy', () => {
    const wrapper = mount(CreateWatchPartyModal, {
      props: {
        open: true,
        item: mockItem,
      },
    });

    expect(wrapper.find('[data-testid="create-watch-party-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Princess Mononoke');
    expect(wrapper.text()).toContain('1997');
    expect(wrapper.text()).toContain('Democratic');
    expect(wrapper.text()).toContain('Host Only');
  });

  it('submits create request to /watch-parties and emits events', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      watchParty: {
        id: 'new-party-123',
        title: 'Princess Mononoke',
      },
    });

    const wrapper = mount(CreateWatchPartyModal, {
      props: {
        open: true,
        item: mockItem,
      },
    });

    // Toggle to host only
    const buttons = wrapper.findAll('button');
    const hostOnlyBtn = buttons.find((b) => b.text().includes('Host Only'));
    expect(hostOnlyBtn).toBeDefined();
    await hostOnlyBtn!.trigger('click');

    // Click launch party
    const launchBtn = buttons.find((b) => b.text().includes('Launch Party'));
    expect(launchBtn).toBeDefined();
    await launchBtn!.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/watch-parties', {
      jellyfinItemId: 'jf-item-555',
      title: 'Princess Mononoke',
      mediaType: 'movie',
      metadataId: undefined,
      year: 1997,
      seasonNumber: undefined,
      episodeNumber: undefined,
      posterUrl: 'https://image.tmdb.org/t/p/w500/mononoke.jpg',
      controlMode: 'host_only',
    });

    expect(wrapper.emitted('created')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
