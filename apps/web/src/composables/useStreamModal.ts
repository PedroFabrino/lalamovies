import { ref, type Ref, type ComputedRef } from 'vue';
import { api } from '../lib/api';
import { useRequestsStore, type MediaType } from '../stores/requests';
import { isKnownPrivateIndexer, type ReleaseCandidate } from '../lib/releaseExplorer';
import type { MetadataCandidate } from './requestTypes';

export interface UseStreamModalOptions {
  isStreamingEnabled: ComputedRef<boolean>;
  mediaType: Ref<MediaType>;
  selectedCandidate: Ref<MetadataCandidate | null>;
  seasonNumber: Ref<number | null>;
  downloadGranularity: Ref<'season' | 'episode'>;
  episodeNumber: Ref<number | null>;
  onStreamPlaybackError?: (payload: { error: string; isInfringing: boolean; infoHash?: string }) => Promise<void> | void;
}

export function useStreamModal(options: UseStreamModalOptions) {
  const {
    isStreamingEnabled,
    mediaType,
    selectedCandidate,
    seasonNumber,
    downloadGranularity,
    episodeNumber,
    onStreamPlaybackError,
  } = options;

  const requestsStore = useRequestsStore();

  const showStreamModal = ref(false);
  const streamModalId = ref('');
  const streamModalTitle = ref('');
  const streamModalStatus = ref<'pending' | 'ready' | 'error'>('pending');
  const streamModalError = ref('');

  const activeStreamingCandidate = ref<ReleaseCandidate | null>(null);
  const isAddingToWaitlistFromModal = ref(false);
  const hasAddedToWaitlistFromModal = ref(false);

  async function handleInstantStreamCandidate(candidate: ReleaseCandidate) {
    if (!isStreamingEnabled.value) {
      requestsStore.showToast('Streaming is currently disabled by administrators', 'error');
      return;
    }
    if (candidate.isInfringing) {
      requestsStore.showToast('This release has been blocked by Real-Debrid due to a DMCA copyright takedown', 'error');
      return;
    }
    if (candidate.isPrivateTracker || isKnownPrivateIndexer(candidate.indexer)) {
      requestsStore.showToast('Releases from private trackers cannot be streamed via cloud debrid', 'error');
      return;
    }

    activeStreamingCandidate.value = candidate;

    try {
      streamModalTitle.value = candidate.title;
      streamModalStatus.value = 'pending';
      streamModalError.value = '';
      showStreamModal.value = true;

      const res = await api.post<{ streamId: string; status: 'pending' | 'ready' }>('/streams', {
        magnetLink: candidate.downloadUrl,
        title: candidate.title,
        indexer: candidate.indexer,
        isPrivateTracker: candidate.isPrivateTracker ?? isKnownPrivateIndexer(candidate.indexer),
        infoHash: candidate.infoHash,
      });

      streamModalId.value = res.streamId;
      if (res.status === 'ready') {
        streamModalStatus.value = 'ready';
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Failed to initialize instant stream';
      await handleStreamPlaybackError({
        error: errorMsg,
        isInfringing: errorMsg.includes('451') || errorMsg.includes('infringing'),
        infoHash: candidate.infoHash,
      });
    }
  }

  async function handleStreamPlaybackError(payload: {
    streamId?: string;
    error: string;
    isInfringing?: boolean;
    infoHash?: string;
  }) {
    streamModalStatus.value = 'error';
    streamModalError.value = payload.error;
    hasAddedToWaitlistFromModal.value = false;

    if (onStreamPlaybackError) {
      const candidate = activeStreamingCandidate.value;
      const isInfringing =
        Boolean(payload.isInfringing) ||
        payload.error.includes('451') ||
        payload.error.includes('infringing') ||
        payload.error.includes('copyright takedown');
      await onStreamPlaybackError({
        error: payload.error,
        isInfringing,
        infoHash: payload.infoHash || candidate?.infoHash,
      });
    }
  }

  async function handleConfirmAddToWaitlist() {
    if (!selectedCandidate.value) return;
    const title = selectedCandidate.value.title;
    isAddingToWaitlistFromModal.value = true;
    try {
      await api.post('/waitlist', {
        mediaType: mediaType.value,
        metadataId: selectedCandidate.value.id,
        metadataSource: selectedCandidate.value.source || 'tmdb',
        title,
        year: selectedCandidate.value.year,
        posterUrl: selectedCandidate.value.posterUrl,
        seasonNumber: mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : null,
        targetEpisode:
          downloadGranularity.value === 'episode' && episodeNumber.value
            ? episodeNumber.value
            : (mediaType.value === 'movie' ? null : 1),
      });
      hasAddedToWaitlistFromModal.value = true;
      requestsStore.showToast(`Added "${title}" to your waitlist!`, 'success');
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string } | null;
      if (error?.status === 409 || error?.message?.includes('already')) {
        hasAddedToWaitlistFromModal.value = true;
        requestsStore.showToast(`"${title}" is already in your library or waitlist.`, 'info');
      } else {
        requestsStore.showToast(`Failed to add to waitlist: ${error?.message || 'Unknown error'}`, 'error');
      }
    } finally {
      isAddingToWaitlistFromModal.value = false;
    }
  }

  return {
    showStreamModal,
    streamModalId,
    streamModalTitle,
    streamModalStatus,
    streamModalError,
    activeStreamingCandidate,
    isAddingToWaitlistFromModal,
    hasAddedToWaitlistFromModal,
    handleInstantStreamCandidate,
    handleStreamPlaybackError,
    handleConfirmAddToWaitlist,
  };
}
