import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, ApiError } from '../lib/api';

export type WaitlistStatus =
  | 'pending_release'
  | 'checking'
  | 'notified'
  | 'triggered'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'error';

export interface WaitlistEntry {
  id: string;
  userId: string;
  mediaType: 'movie' | 'tv_show' | 'anime';
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  targetEpisode?: number | null;
  triggeredCount?: number;
  failureCount?: number;
  status: WaitlistStatus;
  tmdbReleaseDate?: string | null;
  prowlarrReleaseTitle?: string | null;
  prowlarrReleaseMagnet?: string | null;
  prowlarrReleaseScore?: number | null;
  discordMessageId?: string | null;
  notifyAt?: string | null;
  posterUrl?: string | null;
  requesterUsername?: string | null;
  requesterEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  graceHours?: number;
  coRequesterCount?: number;
}

export interface CreateWaitlistPayload {
  mediaType: 'movie' | 'tv_show' | 'anime';
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  targetEpisode?: number | null;
  posterUrl?: string | null;
  requesterUsername?: string | null;
  requesterEmail?: string | null;
  tmdbReleaseDate?: string | null;
}

export const useWaitlistStore = defineStore('waitlist', () => {
  const entries = ref<WaitlistEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const toast = ref<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  function showToast(text: string, type: 'info' | 'success' | 'error' = 'info'): void {
    toast.value = { text, type };
  }

  function clearToast(): void {
    toast.value = null;
  }

  async function fetchAll(options?: { allUsers?: boolean; userId?: string }): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const url = options?.userId ? `/waitlist?userId=${options.userId}` : '/waitlist';
      const data = await api.get<{ entries: WaitlistEntry[] }>(url);
      entries.value = data.entries || [];
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'Failed to load waitlist';
      }
    } finally {
      loading.value = false;
    }
  }

  async function addEntry(payload: CreateWaitlistPayload): Promise<WaitlistEntry> {
    try {
      const data = await api.post<WaitlistEntry | { entry: WaitlistEntry }>('/waitlist', payload);
      const created = 'entry' in data && (data as any).entry ? (data as any).entry : (data as WaitlistEntry);
      entries.value = [created, ...entries.value.filter((e) => e.id !== created.id)];
      showToast(`Added "${created.title}" to waitlist`, 'success');
      return created;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create waitlist entry';
      showToast(msg, 'error');
      throw err;
    }
  }

  async function cancelEntry(id: string): Promise<void> {
    const existingIndex = entries.value.findIndex((e) => e.id === id);
    const existing = entries.value[existingIndex];
    if (!existing) return;

    entries.value = entries.value.filter((e) => e.id !== id);

    try {
      await api.delete(`/waitlist/${id}`);
      showToast(`Removed "${existing.title}" from waitlist`, 'info');
    } catch (err) {
      if (existingIndex !== -1) {
        entries.value.splice(existingIndex, 0, existing);
      }
      const msg = err instanceof ApiError ? err.message : 'Failed to cancel waitlist entry';
      showToast(msg, 'error');
      throw err;
    }
  }

  async function approveEntry(id: string): Promise<void> {
    try {
      await api.post(`/waitlist/${id}/approve`);
      await fetchAll();
      showToast('Release approved! Download initiated.', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to approve release';
      showToast(msg, 'error');
      throw err;
    }
  }

  return {
    entries,
    loading,
    error,
    toast,
    showToast,
    clearToast,
    fetchAll,
    addEntry,
    cancelEntry,
    approveEntry,
  };
});
