import { ref } from 'vue';
import { useRequestsStore, DownloadRequest } from '../stores/requests';
import { api } from '../lib/api';

export function useDashboardActions() {
  const requestsStore = useRequestsStore();

  const showSubtitleModal = ref(false);
  const subtitleTarget = ref<{ id: string; title: string } | null>(null);

  const showRedownloadModal = ref(false);
  const redownloadTarget = ref<DownloadRequest | null>(null);

  const itemToDelete = ref<DownloadRequest | null>(null);
  const isDeleting = ref(false);

  const retryingId = ref<string | null>(null);
  const transcribingId = ref<string | null>(null);

  function openSubtitlePicker(item: DownloadRequest): void {
    subtitleTarget.value = { id: item.id, title: item.title };
    showSubtitleModal.value = true;
  }

  function openRedownloadModal(item: DownloadRequest) {
    redownloadTarget.value = item;
    showRedownloadModal.value = true;
  }

  async function handleRedownloaded(newReq: DownloadRequest) {
    showRedownloadModal.value = false;
    redownloadTarget.value = null;
    requestsStore.showToast(`"${newReq.title}" queued for download!`, 'success');
    await Promise.all([requestsStore.fetchAll(), requestsStore.fetchDeleted()]);
  }

  async function handleToggleKeep(item: DownloadRequest) {
    if (item.mediaType === 'private') return;
    try {
      await requestsStore.toggleKeep(item.id);
    } catch {
      // Handled by store/api
    }
  }

  async function handleRetry(item: DownloadRequest) {
    retryingId.value = item.id;
    try {
      const updated = await requestsStore.retryRequest(item.id);
      requestsStore.showToast(
        updated.status === 'seeding'
          ? `"${item.title}" successfully completed and synced to Jellyfin!`
          : `"${item.title}" reset to downloading.`,
        'success'
      );
    } catch (err: unknown) {
      requestsStore.showToast((err as Error).message || 'Failed to retry request', 'error');
    } finally {
      retryingId.value = null;
    }
  }

  async function executeDelete() {
    if (!itemToDelete.value) return;
    isDeleting.value = true;
    try {
      await requestsStore.deleteRequest(itemToDelete.value.id);
      itemToDelete.value = null;
      requestsStore.fetchDeleted().catch(() => {});
    } finally {
      isDeleting.value = false;
    }
  }

  async function handleTranscribe(item: DownloadRequest) {
    transcribingId.value = item.id;
    try {
      const res = await api.post<{ request: DownloadRequest }>(`/requests/${item.id}/transcribe`);
      if (res?.request) {
        requestsStore.updateRequest(res.request);
      }
      requestsStore.showToast('Subtitle transcription queued.', 'success');
    } catch (err: unknown) {
      requestsStore.showToast((err as Error).message || 'Failed to queue subtitle transcription.', 'error');
    } finally {
      transcribingId.value = null;
    }
  }

  return {
    showSubtitleModal,
    subtitleTarget,
    openSubtitlePicker,
    showRedownloadModal,
    redownloadTarget,
    openRedownloadModal,
    handleRedownloaded,
    itemToDelete,
    isDeleting,
    executeDelete,
    handleToggleKeep,
    retryingId,
    handleRetry,
    transcribingId,
    handleTranscribe,
  };
}
