import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed } from 'vue';
import { useStreamModal } from '../src/composables/useStreamModal';
import { useStreamPlayback } from '../src/composables/useStreamPlayback';
import { api } from '../src/lib/api';
import { setActivePinia, createPinia } from 'pinia';
import { useRequestsStore } from '../src/stores/requests';

vi.mock('../src/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Stream Infringing Error Handling', () => {
  let requestsStore: ReturnType<typeof useRequestsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    requestsStore = useRequestsStore();
    vi.clearAllMocks();
  });

  it('closes modal, shows toast, and calls onStreamPlaybackError when Real-Debrid returns 451 infringing error in useStreamModal', async () => {
    const showToastSpy = vi.spyOn(requestsStore, 'showToast');
    const onStreamPlaybackErrorMock = vi.fn();

    vi.mocked(api.post).mockRejectedValueOnce(
      new Error('Failed to add magnet to Real-Debrid: HTTP 451: infringing_file')
    );

    const streamModal = useStreamModal({
      isStreamingEnabled: computed(() => true),
      mediaType: ref('movie'),
      selectedCandidate: ref({
        id: '123',
        title: 'Incredibles 2',
        year: 2018,
        source: 'tmdb',
        posterUrl: '',
      }),
      seasonNumber: ref(null),
      downloadGranularity: ref('season'),
      episodeNumber: ref(null),
      onStreamPlaybackError: onStreamPlaybackErrorMock,
    });

    await streamModal.handleInstantStreamCandidate({
      title: 'Incredibles 2 (2018) 1080p',
      downloadUrl: 'magnet:?xt=urn:btih:2a4a6d6710f271957b1ea2f8a9a748e84e6d10a3',
      infoHash: '2a4a6d6710f271957b1ea2f8a9a748e84e6d10a3',
      indexer: '1337x',
      seeders: 10,
      sizeBytes: 1000,
      protocol: 'torrent',
    });

    // The modal must be closed immediately so user goes back to the list
    expect(streamModal.showStreamModal.value).toBe(false);

    // Toast error must be shown to the user
    expect(showToastSpy).toHaveBeenCalledWith(
      expect.stringContaining('blocked by Real-Debrid due to a DMCA copyright takedown'),
      'error'
    );

    // onStreamPlaybackError should be notified with isInfringing: true
    expect(onStreamPlaybackErrorMock).toHaveBeenCalledWith({
      error: 'Failed to add magnet to Real-Debrid: HTTP 451: infringing_file',
      isInfringing: true,
      infoHash: '2a4a6d6710f271957b1ea2f8a9a748e84e6d10a3',
    });
  });

  it('closes modal and shows toast when Real-Debrid returns 451 in useStreamPlayback', async () => {
    const showToastSpy = vi.spyOn(requestsStore, 'showToast');

    vi.mocked(api.post).mockRejectedValueOnce(
      new Error('Failed to add magnet to Real-Debrid: HTTP 451: infringing_file')
    );

    const streamPlayback = useStreamPlayback({
      activeStreamsShelfRef: ref(null),
      discoveryFeedRef: ref({ fetchFeed: vi.fn() } as any),
    });

    await streamPlayback.handleInstantStream({
      id: 'd1',
      title: 'Incredibles 2',
      year: 2018,
      mediaType: 'movie',
      streamUrl: 'magnet:?xt=urn:btih:2a4a6d6710f271957b1ea2f8a9a748e84e6d10a3',
    });

    expect(streamPlayback.showStreamModal.value).toBe(false);
    expect(showToastSpy).toHaveBeenCalledWith(
      expect.stringContaining('blocked by Real-Debrid due to a DMCA copyright takedown'),
      'error'
    );
  });
});
