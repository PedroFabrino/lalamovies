import { ref, reactive } from 'vue';
import { api, ApiError } from '../lib/api';
import type { JellyfinStatusInfo, ConfigFormData, TranscriptionFormData } from '../components/admin/AdminConfigTab.vue';

export function useAdminConfig(onConfigSaved?: () => Promise<void>) {
  const isSavingConfig = ref(false);
  const configSuccessMessage = ref<string | null>(null);
  const configErrorMessage = ref<string | null>(null);

  const configForm = reactive<ConfigFormData>({
    storage_quota_gb: 150,
    concurrent_limit: 2,
    disk_warn_threshold: 20,
    disk_reject_threshold: 15,
    discord_webhook_url: '',
    tmdb_api_key: '',
    anime_include_adult: false,
  });

  const isSavingTranscription = ref(false);
  const transcriptionSuccessMessage = ref<string | null>(null);
  const transcriptionErrorMessage = ref<string | null>(null);

  let browserTimezone = 'UTC';
  try {
    browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    browserTimezone = 'UTC';
  }

  const transcriptionForm = reactive<TranscriptionFormData>({
    transcription_window_start: '02:00',
    transcription_window_end: '07:00',
    transcription_timezone: browserTimezone,
  });

  const jellyfinStatus = ref<JellyfinStatusInfo | null>(null);
  const jellyfinLoading = ref(false);
  const isRescanningJellyfin = ref(false);
  const jellyfinMessage = ref<string | null>(null);
  const jellyfinMessageType = ref<'success' | 'error'>('success');

  async function checkJellyfinStatus() {
    jellyfinLoading.value = true;
    jellyfinMessage.value = null;
    try {
      const res = await api.get<JellyfinStatusInfo>('/admin/jellyfin/status');
      jellyfinStatus.value = res;
    } catch (err: unknown) {
      jellyfinStatus.value = {
        reachable: false,
        authenticated: false,
        error: (err as Error).message || 'Failed to check Jellyfin status',
      };
    } finally {
      jellyfinLoading.value = false;
    }
  }

  async function handleRescanJellyfin() {
    isRescanningJellyfin.value = true;
    jellyfinMessage.value = null;
    try {
      const res = await api.post<{ success: boolean; message: string }>('/admin/jellyfin/rescan');
      jellyfinMessage.value = res.message || 'Library rescan triggered successfully';
      jellyfinMessageType.value = 'success';
      await checkJellyfinStatus();
    } catch (err: unknown) {
      jellyfinMessage.value = (err as Error).message || 'Failed to trigger library rescan';
      jellyfinMessageType.value = 'error';
    } finally {
      isRescanningJellyfin.value = false;
    }
  }

  async function loadConfig() {
    try {
      const data = await api.get<{ config: Record<string, string> }>('/admin/config');
      const c = data.config;
      if (c.storage_quota_gb) configForm.storage_quota_gb = parseInt(c.storage_quota_gb, 10);
      if (c.concurrent_limit) configForm.concurrent_limit = parseInt(c.concurrent_limit, 10);
      if (c.disk_warn_threshold) configForm.disk_warn_threshold = parseInt(c.disk_warn_threshold, 10);
      if (c.disk_reject_threshold) configForm.disk_reject_threshold = parseInt(c.disk_reject_threshold, 10);
      if (c.discord_webhook_url) configForm.discord_webhook_url = c.discord_webhook_url;
      if (c.tmdb_api_key) configForm.tmdb_api_key = c.tmdb_api_key;
      if (c.anime_include_adult !== undefined) configForm.anime_include_adult = c.anime_include_adult === 'true';
      if (c.transcription_window_start) transcriptionForm.transcription_window_start = c.transcription_window_start;
      if (c.transcription_window_end) transcriptionForm.transcription_window_end = c.transcription_window_end;
      if (c.transcription_timezone) transcriptionForm.transcription_timezone = c.transcription_timezone;
    } catch {
      // handled
    }
  }

  async function handleSaveConfig() {
    isSavingConfig.value = true;
    configSuccessMessage.value = null;
    configErrorMessage.value = null;

    try {
      await api.put('/admin/config', configForm);
      configSuccessMessage.value = 'Settings saved successfully.';
      if (onConfigSaved) {
        await onConfigSaved();
      }
      setTimeout(() => {
        configSuccessMessage.value = null;
      }, 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        configErrorMessage.value = err.message;
      } else {
        configErrorMessage.value = 'Failed to save configuration.';
      }
    } finally {
      isSavingConfig.value = false;
    }
  }

  async function handleSaveTranscriptionConfig() {
    isSavingTranscription.value = true;
    transcriptionSuccessMessage.value = null;
    transcriptionErrorMessage.value = null;

    try {
      await api.patch('/admin/config', transcriptionForm);
      transcriptionSuccessMessage.value = 'Transcription settings saved successfully.';
      setTimeout(() => {
        transcriptionSuccessMessage.value = null;
      }, 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        transcriptionErrorMessage.value = err.message;
      } else {
        transcriptionErrorMessage.value = 'Failed to save transcription settings.';
      }
    } finally {
      isSavingTranscription.value = false;
    }
  }

  return {
    isSavingConfig,
    configSuccessMessage,
    configErrorMessage,
    configForm,
    isSavingTranscription,
    transcriptionSuccessMessage,
    transcriptionErrorMessage,
    browserTimezone,
    transcriptionForm,
    jellyfinStatus,
    jellyfinLoading,
    isRescanningJellyfin,
    jellyfinMessage,
    jellyfinMessageType,
    checkJellyfinStatus,
    handleRescanJellyfin,
    loadConfig,
    handleSaveConfig,
    handleSaveTranscriptionConfig,
  };
}
