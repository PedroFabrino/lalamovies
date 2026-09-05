import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, ApiError } from '../lib/api';

export type MediaType = 'movie' | 'tv_show' | 'anime';
export type RequestStatus =
  | 'queued'
  | 'downloading'
  | 'hardlinking'
  | 'seeding'
  | 'done'
  | 'error'
  | 'deleted';

export interface DownloadRequest {
  id: string;
  userId: string;
  magnetLink: string;
  mediaType: MediaType;
  status: RequestStatus;
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  seasonNumber: number | null;
  episodeNumber?: number | null;
  jellyfinPath: string | null;
  keepFlag: boolean;
  qbTorrentHash: string | null;
  errorMessage: string | null;
  requestedAt: string;
  downloadedAt: string | null;
  lastPlayedAt: string | null;
  scheduledDeleteAt: string | null;
  sizeBytes: number | null;
  deferredReason?: 'waiting_for_space' | 'waiting_for_slot' | string | null;
  requesterUsername?: string | null;
}

export interface ProgressData {
  progress: number;
  speedBps: number;
  etaSeconds: number;
}

export const useRequestsStore = defineStore('requests', () => {
  const requests = ref<DownloadRequest[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const progressMap = ref<Record<string, ProgressData>>({});
  const toast = ref<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  function showToast(text: string, type: 'info' | 'success' | 'error' = 'info'): void {
    toast.value = { text, type };
  }

  function clearToast(): void {
    toast.value = null;
  }

  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const data = await api.get<{ requests: DownloadRequest[] }>('/requests');
      requests.value = data.requests;
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'Failed to load requests';
      }
    } finally {
      loading.value = false;
    }
  }

  async function deleteRequest(id: string): Promise<void> {
    try {
      await api.delete(`/requests/${id}`);
      requests.value = requests.value.filter((r) => r.id !== id);
      delete progressMap.value[id];
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error('Failed to delete request');
    }
  }

  async function toggleKeep(id: string): Promise<void> {
    try {
      const data = await api.patch<{ request: DownloadRequest }>(`/requests/${id}/keep`);
      const index = requests.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        requests.value[index].keepFlag = data.request.keepFlag;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error('Failed to toggle keep flag');
    }
  }

  function handleProgressMessage(payload: {
    requestId: string;
    progress: number;
    speedBps: number;
    etaSeconds: number;
  }): void {
    progressMap.value[payload.requestId] = {
      progress: payload.progress,
      speedBps: payload.speedBps,
      etaSeconds: payload.etaSeconds,
    };
  }

  function handleStatusMessage(payload: {
    requestId: string;
    status: RequestStatus;
  }): void {
    const item = requests.value.find((r) => r.id === payload.requestId);
    if (item) {
      item.status = payload.status;
    }
    if (payload.status !== 'downloading') {
      delete progressMap.value[payload.requestId];
    }
  }

  return {
    requests,
    loading,
    error,
    progressMap,
    toast,
    showToast,
    clearToast,
    fetchAll,
    deleteRequest,
    toggleKeep,
    handleProgressMessage,
    handleStatusMessage,
  };
});
