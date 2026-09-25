import { ref, onMounted } from 'vue';
import { api } from '../lib/api';
import type { AdminUser } from '../components/admin/AdminUsersTab.vue';
import type { InviteItem } from '../components/admin/AdminInvitesTab.vue';
import type { AdminFeatureFlag } from '../components/admin/AdminFeaturesTab.vue';
import { useAdminConfig } from './useAdminConfig';
import { useAdminCleanup } from './useAdminCleanup';

export function useAdminData() {
  const activeTab = ref<'users' | 'config' | 'cleanup' | 'features'>('users');

  // Confirmation Modal
  const modalAction = ref<{
    title: string;
    message: string;
    isExecuting: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Sub-composables
  const cleanup = useAdminCleanup(modalAction);
  const config = useAdminConfig(cleanup.loadDiskAndCandidates);

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

  async function handleToggleInvitesPermission(targetUser: AdminUser, enabled: boolean) {
    const prev = targetUser.invitesEnabled;
    targetUser.invitesEnabled = enabled;
    try {
      await api.patch<{ user: AdminUser }>(`/admin/users/${targetUser.id}/invites-permission`, {
        invitesEnabled: enabled,
      });
    } catch (err: unknown) {
      targetUser.invitesEnabled = prev;
      userActionError.value = (err as Error).message || 'Failed to update invite permission';
      setTimeout(() => {
        userActionError.value = null;
      }, 5000);
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
      await api.post(`/invites/${token}/revoke`);
      await loadInvites();
    } catch {
      // handled
    }
  }

  onMounted(async () => {
    await Promise.all([
      loadUsers(),
      loadInvites(),
      config.loadConfig(),
      cleanup.loadDiskAndCandidates(),
      loadFeatureFlags(),
      config.checkJellyfinStatus(),
    ]);
  });

  return {
    activeTab,
    modalAction,
    // Feature flags
    featureFlagsList,
    isLoadingFeatureFlags,
    isUpdatingFlag,
    featureFlagsError,
    loadFeatureFlags,
    handleToggleFlag,
    // Users & Invites
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
    loadUsers,
    loadInvites,
    handleRoleChange,
    handleToggleInvitesPermission,
    confirmDeleteUser,
    openInviteModal,
    handleCreateInvite,
    copyInviteUrl,
    handleRevokeInvite,
    // Config sub-composable
    ...config,
    // Cleanup sub-composable
    ...cleanup,
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
