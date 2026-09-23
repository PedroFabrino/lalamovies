import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TorrentReplacementModal from '../src/components/TorrentReplacementModal.vue';
import { useRequestsStore } from '../src/stores/requests';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

describe('TorrentReplacementModal.vue (ADR 0018)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const basePublicItem = {
    id: 'req-pub-1',
    userId: 'user-1',
    magnetLink: 'magnet:?xt=urn:btih:oldhash',
    mediaType: 'movie' as const,
    status: 'downloading' as const,
    metadataId: 'm-1',
    metadataSource: 'tmdb' as const,
    title: 'Inception',
    year: 2010,
    seasonNumber: null,
    jellyfinPath: null,
    keepFlag: false,
    qbTorrentHash: 'old-hash',
    errorMessage: null,
    requestedAt: new Date().toISOString(),
    downloadedAt: null,
    lastPlayedAt: null,
    scheduledDeleteAt: null,
    sizeBytes: 1000000,
  };

  const basePrivateItem = {
    ...basePublicItem,
    id: 'req-priv-1',
    mediaType: 'private' as const,
    title: 'Private Home Video',
  };

  it('renders modal with warning banner when open is true', () => {
    const wrapper = mount(TorrentReplacementModal, {
      props: {
        open: true,
        item: basePublicItem,
      },
    });

    expect(wrapper.find('[data-testid="torrent-replacement-modal"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="replacement-warning-banner"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Destructive Replacement');
    expect(wrapper.text()).toContain('Inception');
  });

  it('automatically searches releases via Prowlarr for public media and selects release', async () => {
    (api.post as any).mockResolvedValueOnce({
      isConfigured: true,
      isReachable: true,
      releases: [
        {
          guid: 'rel-1',
          title: 'Inception.2010.1080p.BluRay.x264',
          formattedSize: '8.5 GB',
          sizeBytes: 8500000000,
          seeders: 45,
          leechers: 2,
          downloadUrl: 'magnet:?xt=urn:btih:newhash123&dn=Inception.1080p',
          indexer: 'TorrentLeech',
          resolution: '1080p',
          codec: 'x264',
          source: 'BluRay',
          score: 95,
          isLowHealth: false,
        },
      ],
    });

    const wrapper = mount(TorrentReplacementModal, {
      props: {
        open: true,
        item: basePublicItem,
      },
    });

    // Wait for search API call
    await vi.waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/requests/search-releases', expect.objectContaining({
        mediaType: 'movie',
        title: 'Inception',
      }));
    });

    await flushPromises();

    const candidateCards = wrapper.findAll('[data-testid="release-candidate-item"]');
    expect(candidateCards.length).toBe(1);
    expect(candidateCards[0].text()).toContain('Inception.2010.1080p');
    expect(candidateCards[0].text()).toContain('8.5 GB');

    // Confirm button is initially disabled before selection
    const confirmBtn = wrapper.find('[data-testid="confirm-replace-btn"]');
    expect(confirmBtn.attributes('disabled')).toBeDefined();

    // Select release
    await candidateCards[0].trigger('click');
    expect(confirmBtn.attributes('disabled')).toBeUndefined();

    // Trigger submit
    const store = useRequestsStore();
    const replaceSpy = vi.spyOn(store, 'replaceTorrent').mockResolvedValueOnce({
      ...basePublicItem,
      magnetLink: 'magnet:?xt=urn:btih:newhash123&dn=Inception.1080p',
    });

    await confirmBtn.trigger('click');

    expect(replaceSpy).toHaveBeenCalledWith('req-pub-1', {
      magnetLink: 'magnet:?xt=urn:btih:newhash123&dn=Inception.1080p',
    });

    expect(wrapper.emitted('replaced')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('enforces Private Tracker Airgap: hides Prowlarr tab and allows manual input only', async () => {
    const wrapper = mount(TorrentReplacementModal, {
      props: {
        open: true,
        item: basePrivateItem,
      },
    });

    // Airgap: No Prowlarr tabs or search calls
    expect(wrapper.find('[data-testid="tab-prowlarr"]').exists()).toBe(false);
    expect(api.post).not.toHaveBeenCalledWith('/requests/search-releases', expect.anything());
    expect(wrapper.text()).toContain('Private Tracker Request: Airgap active');

    // Manual input elements are directly shown
    const magnetInput = wrapper.find('[data-testid="manual-magnet-input"]');
    expect(magnetInput.exists()).toBe(true);

    const confirmBtn = wrapper.find('[data-testid="confirm-replace-btn"]');
    expect(confirmBtn.attributes('disabled')).toBeDefined();

    // Enter manual magnet
    await magnetInput.setValue('magnet:?xt=urn:btih:private12345&dn=PrivateMovie');
    expect(confirmBtn.attributes('disabled')).toBeUndefined();

    const store = useRequestsStore();
    const replaceSpy = vi.spyOn(store, 'replaceTorrent').mockResolvedValueOnce({
      ...basePrivateItem,
      magnetLink: 'magnet:?xt=urn:btih:private12345&dn=PrivateMovie',
    });

    await confirmBtn.trigger('click');

    expect(replaceSpy).toHaveBeenCalledWith('req-priv-1', {
      magnetLink: 'magnet:?xt=urn:btih:private12345&dn=PrivateMovie',
    });
    expect(wrapper.emitted('replaced')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('displays error banner if replaceTorrent fails', async () => {
    const wrapper = mount(TorrentReplacementModal, {
      props: {
        open: true,
        item: basePrivateItem,
      },
    });

    const magnetInput = wrapper.find('[data-testid="manual-magnet-input"]');
    await magnetInput.setValue('magnet:?xt=urn:btih:badtorrent');

    const store = useRequestsStore();
    vi.spyOn(store, 'replaceTorrent').mockRejectedValueOnce(new Error('Storage quota exceeded'));

    const confirmBtn = wrapper.find('[data-testid="confirm-replace-btn"]');
    await confirmBtn.trigger('click');

    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="replacement-error-banner"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Storage quota exceeded');
    expect(wrapper.emitted('close')).toBeFalsy();
  });
});
