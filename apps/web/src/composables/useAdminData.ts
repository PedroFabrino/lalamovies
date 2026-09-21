import { ref, reactive, onMounted } from 'vue';
import { api, ApiError } from '../lib/api';
import type { AdminUser } from '../components/admin/AdminUsersTab.vue';
import type { InviteItem } from '../components/admin/AdminInvitesTab.vue';
import type { DiskInfo } from '../components/admin/AdminCleanupTab.vue';
import type { AdminFeatureFlag } from '../components/admin/AdminFeaturesTab.vue';
import type { JellyfinStatusInfo, ConfigFormData, TranscriptionFormData } from '../components/admin/AdminConfigTab.vue';
import type { DownloadRequest } from '../stores/requests';

export function useAdminData() {
  const activeTab = ref<'users' | 'config' | 'cleanup' | 'features'>('users');

  // Feature Flags
  const featureFlagsList = ref<AdminFeatureFlag[]>([]);
  const isLoadingFeatureFlags = ref(false);
  const isUpdatingFlag = ref<string | null>(null);
  const featureFlagsError = ref<string | null>(null);

  // Users & Invites
  const usersList = ref<AdminUser[]>([]);
  const isLoadingUsers = ref(false);
  const isTogglingRole = ref<string | null>(null);
  const userActionError = ref<string | null>(null);

  const invitesList = ref<InviteItem[]>([]);
  const isLoadingInvites = ref(false);
  const showInviteModal = ref(false);
  const inviteExpiryHours = ref(24);
  const inviteRole = ref<'user' | 'trusted'>('user');
  const isGeneratingInvite = ref(false);
  const generatedInviteUrl = ref<string | null>(null);
  const hasCopiedInvite = ref(false);

  // Confirmation Modal
  const modalAction = ref<{
    title: string;
    message: string;
    isExecuting: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // System Config
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

  // Cleanup
  const diskInfo = ref<DiskInfo | null>(null);
  const candidatesList = ref<DownloadRequest[]>([]);
  const isLoadingCandidates = ref(false);
  const isRunningScan = ref(false);
  const scanFeedback = ref<string | null>(null);

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

  async function loadFeatureFlags() {
    isLoadingFeatureFlags.value = true;
    featureFlagsError.value = null;
    try {
      const data = await api.get<{ features: AdminFeatureFlag[] }>('/admin/features');
      if (data?.features) {
        featureFlagsList.value = data.features;
      }
    } catch (err) {
      featureFlagsError.value = (err as Error).message || 'Failed to load feature flags';
    } finally {
      isLoadingFeatureFlags.value = false;
    }
  }

  async function handleToggleFlag(flag: AdminFeatureFlag, targetEnabled: boolean) {
    const prevValue = flag.enabled;
    flag.enabled = targetEnabled;
    isUpdatingFlag.value = flag.id;
    try {
      const res = await api.patch<{ feature: AdminFeatureFlag; flags: Record<string, boolean> }>(
        `/admin/features/${flag.id}`,
        { enabled: targetEnabled }
      );
      if (res?.feature) {
        const idx = featureFlagsList.value.findIndex((f) => f.id === flag.id);
        if (idx !== -1) {
          featureFlagsList.value[idx] = res.feature;
        }
      }
    } catch (err) {
      flag.enabled = prevValue;
      featureFlagsError.value = (err as Error).message || 'Failed to update feature flag';
      setTimeout(() => {
        featureFlagsError.value = null;
      }, 5000);
    } finally {
      isUpdatingFlag.value = null;
    }
  }

  async function loadUsers() {
    isLoadingUsers.value = true;
    try {
      const data = await api.get<{ users: AdminUser[] }>('/admin/users');
      usersList.value = data.users;
    } catch {
      // handled
    } finally {
      isLoadingUsers.value = false;
    }
  }

  async function loadInvites() {
    isLoadingInvites.value = true;
    try {
      const data = await api.get<{ invites: InviteItem[] }>('/invites');
      invitesList.value = data.invites;
    } catch {
      // handled
    } finally {
      isLoadingInvites.value = false;
    }
  }

  async function handleRoleChange(targetUser: AdminUser, newRole: 'user' | 'trusted' | 'admin') {
    if (targetUser.role === newRole) return;
    const prevRole = targetUser.role;
    isTogglingRole.value = targetUser.id;
    userActionError.value = null;
    try {
      const data = await api.patch<{ user: AdminUser }>(`/admin/users/${targetUser.id}/role`, {
        role: newRole,
      });
      targetUser.role = data.user.role;
    } catch (err: unknown) {
      userActionError.value = (err as Error).message || 'Failed to update user role';
      targetUser.role = prevRole;
      setTimeout(() => {
        userActionError.value = null;
      }, 5000);
    } finally {
      isTogglingRole.value = null;
    }
  }

  function confirmDeleteUser(targetUser: AdminUser) {
    modalAction.value = {
      title: 'Delete User Record?',
      message: `Are you sure you want to remove user "${targetUser.username}" from the database? Their Jellyfin account will remain intact.`,
      isExecuting: false,
      onConfirm: async () => {
        if (!modalAction.value) return;
        modalAction.value.isExecuting = true;
        try {
          await api.delete(`/admin/users/${targetUser.id}`);
          usersList.value = usersList.value.filter((u) => u.id !== targetUser.id);
          modalAction.value = null;
        } catch {
          if (modalAction.value) {
            modalAction.value.isExecuting = false;
          }
        }
      },
    };
  }

  function openInviteModal() {
    generatedInviteUrl.value = null;
    hasCopiedInvite.value = false;
    inviteExpiryHours.value = 24;
    inviteRole.value = 'user';
    showInviteModal.value = true;
  }

  async function handleCreateInvite() {
    isGeneratingInvite.value = true;
    try {
      const data = await api.post<{ invite: InviteItem; url: string }>('/invites', {
        expiresInHours: inviteExpiryHours.value,
        role: inviteRole.value,
      });
      generatedInviteUrl.value = `${window.location.origin}/invite/${data.invite.token}`;
      await loadInvites();
    } catch {
      // handled
    } finally {
      isGeneratingInvite.value = false;
    }
  }

  async function copyInviteUrl() {
    if (!generatedInviteUrl.value) return;
    try {
      await navigator.clipboard.writeText(generatedInviteUrl.value);
      hasCopiedInvite.value = true;
      setTimeout(() => {
        hasCopiedInvite.value = false;
      }, 2500);
    } catch {
      // fallback
    }
  }

  async function handleRevokeInvite(token: string) {
    try {
      await api.delete(`/invites/${token}`);
      invitesList.value = invitesList.value.filter((i) => i.token !== token);
    } catch {
      // handled
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
      await loadDiskAndCandidates();
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

  async function loadDiskAndCandidates() {
    isLoadingCandidates.value = true;
    try {
      const [diskData, candData] = await Promise.all([
        api.get<DiskInfo>('/admin/disk'),
        api.get<{ candidates: DownloadRequest[] }>('/admin/cleanup/candidates'),
      ]);
      diskInfo.value = diskData;
      candidatesList.value = candData.candidates;
    } catch {
      // handled
    } finally {
      isLoadingCandidates.value = false;
    }
  }

  async function handleRunScan() {
    isRunningScan.value = true;
    scanFeedback.value = null;

    try {
      const data = await api.post<{ scheduled: DownloadRequest[] }>('/admin/cleanup');
      if (data.scheduled.length > 0) {
        scanFeedback.value = `Cleanup scan completed: scheduled ${data.scheduled.length} item(s) for deletion.`;
      } else {
        scanFeedback.value = 'Cleanup scan completed: disk space is healthy, no items scheduled.';
      }
      await loadDiskAndCandidates();
    } catch {
      scanFeedback.value = 'Failed to run cleanup scan.';
    } finally {
      isRunningScan.value = false;
    }
  }

  function confirmCleanItem(cand: DownloadRequest) {
    modalAction.value = {
      title: 'Clean Item Immediately?',
      message: `Are you sure you want to clean "${cand.title}" now? This will remove files and torrent immediately without the 24-hour waiting period.`,
      isExecuting: false,
      onConfirm: async () => {
        if (!modalAction.value) return;
        modalAction.value.isExecuting = true;
        try {
          await api.post(`/admin/cleanup/${cand.id}`);
          candidatesList.value = candidatesList.value.filter((c) => c.id !== cand.id);
          modalAction.value = null;
          await loadDiskAndCandidates();
        } catch {
          if (modalAction.value) {
            modalAction.value.isExecuting = false;
          }
        }
      },
    };
  }

  onMounted(async () => {
    await Promise.all([
      loadUsers(),
      loadInvites(),
      loadConfig(),
      loadDiskAndCandidates(),
      loadFeatureFlags(),
      checkJellyfinStatus(),
    ]);
  });

  return {
    activeTab,
    featureFlagsList,
    isLoadingFeatureFlags,
    isUpdatingFlag,
    featureFlagsError,
    usersList,
    isLoadingUsers,
    isTogglingRole,
    userActionError,
    invitesList,
    isLoadingInvites,
    showInviteModal,
    inviteExpiryHours,
    inviteRole,
    isGeneratingInvite,
    generatedInviteUrl,
    hasCopiedInvite,
    modalAction,
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
    diskInfo,
    candidatesList,
    isLoadingCandidates,
    isRunningScan,
    scanFeedback,
    loadUsers,
    loadInvites,
    loadConfig,
    loadDiskAndCandidates,
    loadFeatureFlags,
    checkJellyfinStatus,
    handleRoleChange,
    confirmDeleteUser,
    openInviteModal,
    handleCreateInvite,
    copyInviteUrl,
    handleRevokeInvite,
    handleSaveConfig,
    handleRescanJellyfin,
    handleSaveTranscriptionConfig,
    handleRunScan,
    confirmCleanItem,
    handleToggleFlag,
    formatDate,
    formatMediaSubtitle,
  };
}

export function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatMediaSubtitle(req: { mediaType?: string; seasonNumber?: number | null; episodeNumber?: number | null }): string {
  if (req.mediaType === 'tv_show' || req.mediaType === 'anime') {
    if (req.seasonNumber != null && req.episodeNumber != null) {
      return `S${String(req.seasonNumber).padStart(2, '0')}E${String(req.episodeNumber).padStart(2, '0')}`;
    }
    if (req.seasonNumber != null) {
      return `Season ${req.seasonNumber}`;
    }
  }
  return '';
}
