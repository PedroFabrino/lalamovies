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

  it('loads media options when opened in generic mode (item is null) and launches selected', async () => {
    vi.mocked(api.get = vi.fn()).mockImplementation((url: string) => {
      if (url === '/streams') {
        return Promise.resolve({
          streams: [
            {
              id: 'st-1',
              title: 'Spirited Away',
              status: 'ready',
              jellyfinItemId: 'jf-stream-10',
            },
          ],
        });
      }
      if (url === '/requests') {
        return Promise.resolve({
          requests: [
            {
              id: 'req-1',
              title: 'Howl\'s Moving Castle',
              status: 'completed',
              jellyfinPath: '/media/movies/Howls.Moving.Castle.2004',
              mediaType: 'movie',
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      watchParty: {
        id: 'new-party-456',
        title: 'Spirited Away',
      },
    });

    const wrapper = mount(CreateWatchPartyModal, {
      props: {
        open: true,
        item: null,
      },
    });
    await flushPromises();

    // Check media selection dropdown exists
    const select = wrapper.find('select[data-testid="media-select"]');
    expect(select.exists()).toBe(true);

    // Option for Spirited Away exists
    const options = select.findAll('option');
    expect(options.some((o) => o.text().includes('Spirited Away'))).toBe(true);

    // Select Spirited Away
    await select.setValue('jf-stream-10');

    // Launch party
    const launchBtn = wrapper.find('button.bg-purple-600');
    await launchBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith(
      '/watch-parties',
      expect.objectContaining({
        jellyfinItemId: 'jf-stream-10',
        title: 'Spirited Away',
      })
    );
    expect(wrapper.emitted('created')).toBeTruthy();
  });

  it('allows manual entry mode when item is null', async () => {
    vi.mocked(api.get = vi.fn()).mockResolvedValue({ streams: [], requests: [] });
    vi.mocked(api.post).mockResolvedValueOnce({
      watchParty: {
        id: 'new-party-manual',
        title: 'Akira',
      },
    });

    const wrapper = mount(CreateWatchPartyModal, {
      props: {
        open: true,
        item: null,
      },
    });
    await flushPromises();

    // Toggle manual entry mode
    const manualBtn = wrapper.find('button[data-testid="toggle-manual-entry"]');
    expect(manualBtn.exists()).toBe(true);
    await manualBtn.trigger('click');

    // Inputs should exist
    const titleInput = wrapper.find('input[data-testid="manual-title-input"]');
    const itemIdInput = wrapper.find('input[data-testid="manual-item-id-input"]');
    expect(titleInput.exists()).toBe(true);
    expect(itemIdInput.exists()).toBe(true);

    await titleInput.setValue('Akira');
    await itemIdInput.setValue('jf-akira-999');

    // Launch
    const launchBtn = wrapper.find('button.bg-purple-600');
    await launchBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith(
      '/watch-parties',
      expect.objectContaining({
        jellyfinItemId: 'jf-akira-999',
        title: 'Akira',
        mediaType: 'movie',
      })
    );
    expect(wrapper.emitted('created')).toBeTruthy();
  });
});
