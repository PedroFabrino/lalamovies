<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <Navbar />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
      <div class="mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-white">
          Administration Panel
        </h1>
        <p class="text-sm text-zinc-400 mt-1">
          Manage server users, invite friends, configure system thresholds, and review storage cleanup.
        </p>
      </div>

      <div class="flex border-b border-zinc-800 mb-8 gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer"
          :class="admin.activeTab.value === tab.id
            ? 'border-indigo-500 text-white font-semibold'
            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'"
          @click="onTabClick(tab.id)"
        >
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Tab 1: Users & Invites -->
      <div
        v-if="admin.activeTab.value === 'users'"
        class="space-y-8"
      >
        <AdminUsersTab
          :users-list="admin.usersList.value"
          :is-loading-users="admin.isLoadingUsers.value"
          :is-toggling-role="admin.isTogglingRole.value"
          :user-action-error="admin.userActionError.value"
          :auth-user-id="authStore.user?.id"
          :is-invites-enabled="featureFlags.isEnabled('user_invites')"
          :format-date="admin.formatDate"
          @change-role="admin.handleRoleChange"
          @delete-user="admin.confirmDeleteUser"
          @open-invite-modal="admin.openInviteModal"
          @clear-error="admin.userActionError.value = null"
        />

        <AdminInvitesTab
          v-model:invite-role="admin.inviteRole.value"
          v-model:invite-expiry-hours="admin.inviteExpiryHours.value"
          :invites-list="admin.invitesList.value"
          :is-loading-invites="admin.isLoadingInvites.value"
          :show-invite-modal="admin.showInviteModal.value"
          :is-generating-invite="admin.isGeneratingInvite.value"
          :generated-invite-url="admin.generatedInviteUrl.value"
          :has-copied-invite="admin.hasCopiedInvite.value"
          :format-date="admin.formatDate"
          @revoke-invite="admin.handleRevokeInvite"
          @close-invite-modal="admin.showInviteModal.value = false"
          @create-invite="admin.handleCreateInvite"
          @copy-invite-url="admin.copyInviteUrl"
        />
      </div>

      <!-- Tab 2: System Config -->
      <AdminConfigTab
        v-else-if="admin.activeTab.value === 'config'"
        :config-form="admin.configForm"
        :is-saving-config="admin.isSavingConfig.value"
        :config-success-message="admin.configSuccessMessage.value"
        :config-error-message="admin.configErrorMessage.value"
        :jellyfin-status="admin.jellyfinStatus.value"
        :jellyfin-loading="admin.jellyfinLoading.value"
        :is-rescanning-jellyfin="admin.isRescanningJellyfin.value"
        :jellyfin-message="admin.jellyfinMessage.value"
        :jellyfin-message-type="admin.jellyfinMessageType.value"
        :transcription-form="admin.transcriptionForm"
        :is-saving-transcription="admin.isSavingTranscription.value"
        :transcription-success-message="admin.transcriptionSuccessMessage.value"
        :transcription-error-message="admin.transcriptionErrorMessage.value"
        :browser-timezone="admin.browserTimezone"
        @save-config="admin.handleSaveConfig"
        @check-jellyfin-status="admin.checkJellyfinStatus"
        @rescan-jellyfin="admin.handleRescanJellyfin"
        @save-transcription-config="admin.handleSaveTranscriptionConfig"
      />

      <!-- Tab 3: Disk & Cleanup -->
      <AdminCleanupTab
        v-else-if="admin.activeTab.value === 'cleanup'"
        :disk-info="admin.diskInfo.value"
        :is-running-scan="admin.isRunningScan.value"
        :scan-feedback="admin.scanFeedback.value"
        :candidates-list="admin.candidatesList.value"
        :is-loading-candidates="admin.isLoadingCandidates.value"
        :format-media-type="formatMediaType"
        :format-media-subtitle="admin.formatMediaSubtitle"
        :format-date="admin.formatDate"
        :format-speed="formatSpeed"
        @switch-tab="admin.activeTab.value = $event"
        @run-scan="admin.handleRunScan"
        @dismiss-scan-feedback="admin.scanFeedback.value = null"
        @clean-item="admin.confirmCleanItem"
        @refresh="admin.loadDiskAndCandidates"
      />

      <!-- Tab 4: Feature Flags -->
      <AdminFeaturesTab
        v-else-if="admin.activeTab.value === 'features'"
        :feature-flags-list="admin.featureFlagsList.value"
        :is-loading-feature-flags="admin.isLoadingFeatureFlags.value"
        :is-updating-flag="admin.isUpdatingFlag.value"
        :feature-flags-error="admin.featureFlagsError.value"
        :format-date="admin.formatDate"
        @refresh="admin.loadFeatureFlags"
        @dismiss-error="admin.featureFlagsError.value = null"
        @toggle-flag="admin.handleToggleFlag"
      />
    </main>

    <!-- Action Confirmation Modal (Delete User / Clean Item) -->
    <div
      v-if="admin.modalAction.value"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 class="text-base font-semibold text-white">
          {{ admin.modalAction.value.title }}
        </h3>
        <p class="text-xs text-zinc-400 leading-relaxed">
          {{ admin.modalAction.value.message }}
        </p>
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            :disabled="admin.modalAction.value.isExecuting"
            class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition cursor-pointer disabled:opacity-50"
            @click="admin.modalAction.value = null"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="admin.modalAction.value.isExecuting"
            class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            @click="admin.modalAction.value.onConfirm"
          >
            <svg
              v-if="admin.modalAction.value.isExecuting"
              class="animate-spin h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>{{ admin.modalAction.value.isExecuting ? 'Processing...' : 'Confirm' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Navbar from '../components/Navbar.vue';
import AdminUsersTab, { AdminUser } from '../components/admin/AdminUsersTab.vue';
import AdminInvitesTab, { InviteItem } from '../components/admin/AdminInvitesTab.vue';
import AdminConfigTab from '../components/admin/AdminConfigTab.vue';
import AdminCleanupTab, { DiskInfo } from '../components/admin/AdminCleanupTab.vue';
import AdminFeaturesTab, { AdminFeatureFlag } from '../components/admin/AdminFeaturesTab.vue';
import { useAuthStore } from '../stores/auth';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import { useAdminData } from '../composables/useAdminData';
import { formatMediaType, formatSpeed } from '../lib/formatters';

export type { AdminUser, InviteItem, DiskInfo, AdminFeatureFlag };

const authStore = useAuthStore();
const featureFlags = useFeatureFlags();

const tabs = [
  { id: 'users', label: 'Users & Invites' },
  { id: 'config', label: 'System Config' },
  { id: 'cleanup', label: 'Disk & Cleanup' },
  { id: 'features', label: 'Feature Flags' },
] as const;

type AdminTab = typeof tabs[number]['id'];

const admin = useAdminData();

function onTabClick(tabId: AdminTab) {
  admin.activeTab.value = tabId;
  if (tabId === 'features') {
    admin.loadFeatureFlags();
  }
}
</script>
