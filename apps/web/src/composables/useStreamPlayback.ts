import { ref, type Ref } from 'vue';
import { api } from '../lib/api';
import { useRequestsStore } from '../stores/requests';
import type { DiscoveryItem } from '../components/DiscoveryFeed.vue';
import type ActiveStreamsShelf from '../components/ActiveStreamsShelf.vue';
import type DiscoveryFeed from '../components/DiscoveryFeed.vue';

export function useStreamPlayback(options: {
  activeStreamsShelfRef: Ref<InstanceType<typeof ActiveStreamsShelf> | null>;
  discoveryFeedRef: Ref<InstanceType<typeof DiscoveryFeed> | null>;
}) {
  const requestsStore = useRequestsStore();

  const showStreamModal = ref(false);
  const streamModalId = ref('');
  const streamModalTitle = ref('');
  const streamModalStatus = ref<'pending' | 'ready' | 'error'>('pending');
  const streamModalError = ref('');

  const showPromotionModal = ref(false);
  const promotionStream = ref<{ id: string; title: string; magnetLink?: string } | null>(null);
  const activeStreamingItem = ref<DiscoveryItem | null>(null);
  const isAddingToWaitlistFromModal = ref(false);
  const hasAddedToWaitlistFromModal = ref(false);

  async function handleInstantStream(item: DiscoveryItem) {
    activeStreamingItem.value = item;
    try {
      streamModalTitle.value = item.title;
      streamModalStatus.value = 'pending';
      streamModalError.value = '';
      showStreamModal.value = true;

      const res = await api.post<{ streamId: string; status: 'pending' | 'ready' }>('/streams', {
        magnetLink: item.streamUrl || item.downloadUrl,
        title: item.title,
        isPrivateTracker: item.streamUrl ? false : item.isPrivateTracker,
      });

      streamModalId.value = res.streamId;
      if (res.status === 'ready') {
        streamModalStatus.value = 'ready';
      }
      options.activeStreamsShelfRef.value?.fetchStreams();
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Failed to initialize instant stream';
      await handleStreamPlaybackError({
        error: errorMsg,
        isInfringing: errorMsg.includes('451') || errorMsg.includes('infringing'),
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

    const item = activeStreamingItem.value;
    if (!item) return;

    const isInfringing =
      Boolean(payload.isInfringing) ||
      payload.error.includes('451') ||
      payload.error.includes('infringing');

    const failedHash = payload.infoHash;
    if (isInfringing && failedHash) {
      try {
        await api.post('/requests/mark-infringing', { infoHash: failedHash });
      } catch {
        // Non-blocking
      }
    }

    options.discoveryFeedRef.value?.fetchFeed?.();
  }

  async function handleConfirmAddToWaitlist() {
    const item = activeStreamingItem.value;
    if (!item) return;
    isAddingToWaitlistFromModal.value = true;
    try {
      await api.post('/waitlist', {
        mediaType: item.mediaType,
        metadataId: item.metadataId,
        metadataSource: item.metadataSource || (item.mediaType === 'anime' ? 'anilist' : 'tmdb'),
        title: item.title,
        year: item.year,
        posterUrl: item.posterUrl,
      });
      hasAddedToWaitlistFromModal.value = true;
      requestsStore.showToast(`Added "${item.title}" to your waitlist!`, 'success');
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string } | null;
      if (error?.status === 409 || error?.message?.includes('already')) {
        hasAddedToWaitlistFromModal.value = true;
        requestsStore.showToast(`"${item.title}" is already in your library or waitlist.`, 'info');
      } else {
        requestsStore.showToast(`Failed to add to waitlist: ${error?.message || 'Unknown error'}`, 'error');
      }
    } finally {
      isAddingToWaitlistFromModal.value = false;
    }
  }

  function handleOpenPromotion(payload: { id?: string; streamId?: string; title: string }) {
    showStreamModal.value = false;
    promotionStream.value = {
      id: payload.id || payload.streamId || '',
      title: payload.title,
    };
    showPromotionModal.value = true;
  }

  async function handleStreamPromoted() {
    showPromotionModal.value = false;
    requestsStore.showToast('Stream successfully promoted to permanent library!', 'success');
    await requestsStore.fetchAll();
    options.activeStreamsShelfRef.value?.fetchStreams();
  }

  return {
    showStreamModal,
    streamModalId,
    streamModalTitle,
    streamModalStatus,
    streamModalError,
    showPromotionModal,
    promotionStream,
    activeStreamingItem,
    isAddingToWaitlistFromModal,
    hasAddedToWaitlistFromModal,
    handleInstantStream,
    handleStreamPlaybackError,
    handleConfirmAddToWaitlist,
    handleOpenPromotion,
    handleStreamPromoted,
  };
}
