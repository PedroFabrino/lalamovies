import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CreateWatchPartyModal from '../src/components/CreateWatchPartyModal.vue';
import { api, ApiError } from '../src/lib/api';

vi.mock('../src/lib/api', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/api')>('../src/lib/api');
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

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

  it('omits streams from media dropdown when streaming feature flag is disabled', async () => {
    const { useFeatureFlags } = await import('../src/composables/useFeatureFlags');
    const ff = useFeatureFlags();
    ff.setFlag('streaming', false);

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
              title: "Howl's Moving Castle",
              status: 'completed',
              jellyfinPath: '/media/movies/Howls.Moving.Castle.2004',
              mediaType: 'movie',
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    const wrapper = mount(CreateWatchPartyModal, {
      props: {
        open: true,
        item: null,
      },
    });
    await flushPromises();

    // /streams should NOT have been fetched
    expect(api.get).not.toHaveBeenCalledWith('/streams');

    // Dropdown should only contain library items, not streams
    const select = wrapper.find('select[data-testid="media-select"]');
    expect(select.exists()).toBe(true);
    const options = select.findAll('option');
    expect(options.some((o) => o.text().includes('Spirited Away'))).toBe(false);
    expect(options.some((o) => o.text().includes("Howl's Moving Castle"))).toBe(true);

    // Reset flag for other tests
    ff.setFlag('streaming', true);
  });

  it('prompts for password and retries party creation when server returns JELLYFIN_TOKEN_REQUIRED (#216)', async () => {
    // First call to /watch-parties fails with 403 JELLYFIN_TOKEN_REQUIRED
    vi.mocked(api.post)
      .mockRejectedValueOnce(
        new ApiError('Jellyfin user authentication is required to host a SyncPlay party', 403, {
          code: 'JELLYFIN_TOKEN_REQUIRED',
        }),
      )
      // Second call to /auth/jellyfin-token succeeds
      .mockResolvedValueOnce({ ok: true, hasJellyfinToken: true })
      // Third call to /watch-parties retry succeeds
      .mockResolvedValueOnce({
        watchParty: {
          id: 'party-reauth-1',
          title: 'Princess Mononoke',
          jellyfinWebUrl: 'https://watch.lalamovies.stream/web/index.html#!/details?id=jf-item-555',
        },
      });

    const wrapper = mount(CreateWatchPartyModal, {
      props: {
        open: true,
        item: mockItem,
      },
    });

    // Click Launch Party
    const launchBtn = wrapper.find('[data-testid="launch-party-submit-btn"]');
    await launchBtn.trigger('click');
    await flushPromises();

    // Reauth prompt should be visible
    const reauthPrompt = wrapper.find('[data-testid="reauth-prompt"]');
    expect(reauthPrompt.exists()).toBe(true);
    expect(reauthPrompt.text()).toContain('Jellyfin Re-Authentication Required');

    // Enter password
    const pwdInput = wrapper.find('[data-testid="reauth-password-input"]');
    await pwdInput.setValue('mySecretPass');

    // Click Authorize
    const authBtn = wrapper.find('[data-testid="reauth-submit-btn"]');
    await authBtn.trigger('click');
    await flushPromises();

    // Should have posted token and re-created party
    expect(api.post).toHaveBeenCalledWith('/auth/jellyfin-token', { password: 'mySecretPass' });
    expect(wrapper.emitted('created')).toBeTruthy();
  });
});
