import { ref } from 'vue';
import { api, ApiError } from '../lib/api';

export interface PreferredIndexerCookieStatus {
  configured: boolean;
  indexerId?: number;
  indexerName?: string;
  hasCookie: boolean;
  cookiePreview?: string;
  isExpired: boolean;
  status: 'ok' | 'expired' | 'missing' | 'unreachable' | 'not_configured';
  message?: string;
  lastChecked?: string;
}

export function usePreferredIndexerCookie() {
  const cookieStatus = ref<PreferredIndexerCookieStatus | null>(null);
  const isLoadingStatus = ref(false);
  const isTesting = ref(false);
  const isSaving = ref(false);
  const cookieInput = ref('');
  const feedbackMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchCookieStatus(forceRefresh = false) {
    isLoadingStatus.value = true;
    try {
      const url = forceRefresh ? '/admin/preferred-indexer/cookie?refresh=true' : '/admin/preferred-indexer/cookie';
      const data = await api.get<PreferredIndexerCookieStatus>(url);
      cookieStatus.value = data;
    } catch (err) {
      cookieStatus.value = {
        configured: false,
        hasCookie: false,
        isExpired: false,
        status: 'unreachable',
        message: (err as Error).message || 'Failed to check preferred indexer cookie status',
      };
    } finally {
      isLoadingStatus.value = false;
    }
  }

  async function testCookie(candidateOverride?: string) {
    isTesting.value = true;
    feedbackMessage.value = null;
    try {
      const payload = candidateOverride ? { cookie: candidateOverride } : undefined;
      const res = await api.post<{ ok: boolean; message: string }>('/admin/preferred-indexer/cookie/test', payload);
      feedbackMessage.value = {
        type: 'success',
        text: res.message || 'Cookie verified successfully.',
      };
    } catch (err) {
      const text = err instanceof ApiError ? err.message : ((err as Error).message || 'Cookie validation failed.');
      feedbackMessage.value = {
        type: 'error',
        text,
      };
    } finally {
      isTesting.value = false;
    }
  }

  async function saveCookie(newCookie: string) {
    const trimmed = newCookie.trim();
    if (!trimmed) {
      feedbackMessage.value = { type: 'error', text: 'Please enter a cookie string before saving.' };
      return;
    }

    isSaving.value = true;
    feedbackMessage.value = null;
    try {
      const res = await api.put<{ ok: boolean; message: string }>('/admin/preferred-indexer/cookie', {
        cookie: trimmed,
      });
      feedbackMessage.value = {
        type: 'success',
        text: res.message || 'Cookie updated and verified successfully.',
      };
      cookieInput.value = '';
      await fetchCookieStatus(true);
    } catch (err) {
      const text = err instanceof ApiError ? err.message : ((err as Error).message || 'Failed to update cookie.');
      feedbackMessage.value = {
        type: 'error',
        text,
      };
    } finally {
      isSaving.value = false;
    }
  }

  return {
    cookieStatus,
    isLoadingStatus,
    isTesting,
    isSaving,
    cookieInput,
    feedbackMessage,
    fetchCookieStatus,
    testCookie,
    saveCookie,
  };
}
