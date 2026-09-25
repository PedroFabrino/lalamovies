<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <Navbar />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
      <!-- Toast Alert -->
      <div
        v-if="requestsStore.toast"
        class="mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg"
        :class="requestsStore.toast.type === 'error'
          ? 'bg-red-950/60 border-red-800 text-red-200'
          : requestsStore.toast.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
            : 'bg-indigo-950/60 border-indigo-800 text-indigo-200'"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-sm font-medium">{{ requestsStore.toast.text }}</span>
        </div>
        <button
          type="button"
          class="p-1 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
          @click="requestsStore.clearToast"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Feature Shelves -->
      <UpNextShelf v-if="featureFlags.isEnabled('up_next')" />
      <DiscoveryFeed
        v-if="featureFlags.isEnabled('discovery_feed')"
        ref="discoveryFeedRef"
        @instant-stream="streamPlayback.handleInstantStream"
      />
      <ActiveStreamsShelf
        v-if="featureFlags.isEnabled('streaming')"
        ref="activeStreamsShelfRef"
        @promote="streamPlayback.handleOpenPromotion"
      />

      <!-- Header & Top Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white">
            Download Requests
          </h1>
          <p class="text-sm text-zinc-400 mt-1">
            Real-time status of downloads and media library items
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
            :disabled="requestsStore.loading || requestsStore.loadingDeleted"
            title="Refresh List"
            @click="refreshCurrentTab"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': requestsStore.loading || requestsStore.loadingDeleted }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <router-link
            to="/request"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition flex items-center gap-2"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add Request</span>
          </router-link>
        </div>
      </div>

      <!-- Admin Storage Quota Summary Banner -->
      <StorageQuotaBanner
        v-if="authStore.isAdmin"
        :disk-info="diskInfo"
      />

      <!-- Tab Navigation: Active vs Deleted History -->
      <div class="flex items-center gap-2 border-b border-zinc-800 mb-6 pb-2">
        <button
          type="button"
          data-testid="tab-active-requests"
          class="px-4 py-2 text-sm font-medium rounded-lg transition cursor-pointer flex items-center gap-2"
          :class="activeTab === 'active'
            ? 'bg-zinc-800 text-white font-semibold shadow-xs'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'"
          @click="setActiveTab('active')"
        >
          <span>Active Requests</span>
          <span
            v-if="(requestsStore.requests?.length ?? 0) > 0"
            class="px-2 py-0.2 rounded-full text-xs font-medium bg-zinc-700/60 text-zinc-300"
          >
            {{ requestsStore.requests.length }}
          </span>
        </button>

        <button
          type="button"
          data-testid="tab-deleted-history"
          class="px-4 py-2 text-sm font-medium rounded-lg transition cursor-pointer flex items-center gap-2"
          :class="activeTab === 'deleted'
            ? 'bg-zinc-800 text-white font-semibold shadow-xs'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'"
          @click="setActiveTab('deleted')"
        >
          <span>Deleted History</span>
          <span
            v-if="(requestsStore.deletedRequests?.length ?? 0) > 0"
            class="px-2 py-0.2 rounded-full text-xs font-medium bg-zinc-700/60 text-zinc-300"
          >
            {{ requestsStore.deletedRequests.length }}
          </span>
        </button>
      </div>

      <!-- Active Requests View -->
      <section v-if="activeTab === 'active'">
        <!-- Loading Skeleton -->
        <div
          v-if="requestsStore.loading && requestsStore.requests.length === 0"
          class="space-y-3"
        >
          <div
            v-for="i in 3"
            :key="i"
            class="h-20 bg-zinc-900/60 border border-zinc-800/80 rounded-xl animate-pulse"
          />
        </div>

        <!-- Empty State -->
        <div
          v-else-if="publicRequests.length === 0 && (!authStore.isTrusted || privateRequests.length === 0)"
          class="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-12 text-center my-8"
        >
          <div class="w-14 h-14 mx-auto rounded-full bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-400 mb-4">
            <svg
              class="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-white mb-1">
            No requests yet
          </h3>
          <p class="text-sm text-zinc-400 max-w-sm mx-auto mb-6">
            Submit a magnet link from any torrent site to download and automatically add it to your Jellyfin media library.
          </p>
          <router-link
            to="/request"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
          >
            Submit First Request
          </router-link>
        </div>

        <!-- Active Tables -->
        <div
          v-else
          class="space-y-8"
        >
          <ActiveRequestsTable
            v-if="publicRequests.length > 0"
            :requests="publicRequests"
            :is-admin="authStore.isAdmin"
            :current-user-id="authStore.user?.id"
            :retrying-id="retryingId"
            @toggle-keep="handleToggleKeep"
            @open-subtitles="openSubtitlePicker"
            @replace-torrent="(item) => replaceTarget = item"
            @retry="handleRetry"
            @delete="(item) => itemToDelete = item"
          />

          <PrivateRequestsTable
            v-if="authStore.isTrusted && privateRequests.length > 0"
            :requests="privateRequests"
            :is-admin="authStore.isAdmin"
            :is-trusted="authStore.isTrusted"
            :current-user-id="authStore.user?.id"
            :retrying-id="retryingId"
            :transcribing-id="transcribingId"
            @open-subtitles="openSubtitlePicker"
            @transcribe="handleTranscribe"
            @replace-torrent="(item) => replaceTarget = item"
            @retry="handleRetry"
            @delete="(item) => itemToDelete = item"
          />
        </div>
      </section>

      <!-- Deleted History View -->
      <section v-else-if="activeTab === 'deleted'">
        <DeletedRequestsList
          :items="requestsStore.deletedRequests"
          :loading="requestsStore.loadingDeleted"
          @redownload="openRedownloadModal"
        />
      </section>
    </main>

    <!-- Modals -->
    <DeleteRequestModal
      :item="itemToDelete"
      :is-deleting="isDeleting"
      @close="itemToDelete = null"
      @confirm="executeDelete"
    />

    <RedownloadModal
      :show="showRedownloadModal"
      :item="redownloadTarget"
      @close="showRedownloadModal = false"
      @redownloaded="handleRedownloaded"
    />

    <StreamProgressModal
      :show="streamPlayback.showStreamModal.value"
      :stream-id="streamPlayback.streamModalId.value"
      :title="streamPlayback.streamModalTitle.value"
      :initial-status="streamPlayback.streamModalStatus.value"
      :error-message="streamPlayback.streamModalError.value"
      :can-add-to-waitlist="Boolean(streamPlayback.activeStreamingItem.value)"
      :is-adding-to-waitlist="streamPlayback.isAddingToWaitlistFromModal.value"
      :waitlist-added="streamPlayback.hasAddedToWaitlistFromModal.value"
      @close="streamPlayback.showStreamModal.value = false"
      @promote="streamPlayback.handleOpenPromotion"
      @error="streamPlayback.handleStreamPlaybackError"
      @add-to-waitlist="streamPlayback.handleConfirmAddToWaitlist"
    />

    <PromotionModal
      :show="streamPlayback.showPromotionModal.value"
      :stream="streamPlayback.promotionStream.value"
      @close="streamPlayback.showPromotionModal.value = false"
      @promoted="streamPlayback.handleStreamPromoted"
    />

    <SubtitlePickerModal
      :show="showSubtitleModal"
      :request-id="subtitleTarget?.id || ''"
      :title="subtitleTarget?.title"
      @close="showSubtitleModal = false"
    />

    <TorrentReplacementModal
      :open="!!replaceTarget"
      :item="replaceTarget"
      @close="replaceTarget = null"
      @replaced="requestsStore.fetchAll"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Navbar from '../components/Navbar.vue';
import UpNextShelf from '../components/UpNextShelf.vue';
import DiscoveryFeed from '../components/DiscoveryFeed.vue';
import StreamProgressModal from '../components/StreamProgressModal.vue';
import PromotionModal from '../components/PromotionModal.vue';
import SubtitlePickerModal from '../components/SubtitlePickerModal.vue';
import TorrentReplacementModal from '../components/TorrentReplacementModal.vue';
import ActiveStreamsShelf from '../components/ActiveStreamsShelf.vue';
import ActiveRequestsTable from '../components/requests/ActiveRequestsTable.vue';
import PrivateRequestsTable from '../components/requests/PrivateRequestsTable.vue';
import DeletedRequestsList from '../components/requests/DeletedRequestsList.vue';
import DeleteRequestModal from '../components/requests/DeleteRequestModal.vue';
import RedownloadModal from '../components/requests/RedownloadModal.vue';
import StorageQuotaBanner, { DiskInfo } from '../components/dashboard/StorageQuotaBanner.vue';
import { useAuthStore } from '../stores/auth';
import { useRequestsStore, DownloadRequest } from '../stores/requests';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import { useStreamPlayback } from '../composables/useStreamPlayback';
import { api } from '../lib/api';

const authStore = useAuthStore();
const requestsStore = useRequestsStore();
const featureFlags = useFeatureFlags();

const activeTab = ref<'active' | 'deleted'>('active');
const publicRequests = computed(() => requestsStore.requests.filter((r) => r.mediaType !== 'private'));
const privateRequests = computed(() => requestsStore.requests.filter((r) => r.mediaType === 'private'));

const itemToDelete = ref<DownloadRequest | null>(null);
const replaceTarget = ref<DownloadRequest | null>(null);
const redownloadTarget = ref<DownloadRequest | null>(null);
const showRedownloadModal = ref(false);
const isDeleting = ref(false);
const diskInfo = ref<DiskInfo | null>(null);

const activeStreamsShelfRef = ref<InstanceType<typeof ActiveStreamsShelf> | null>(null);
const discoveryFeedRef = ref<InstanceType<typeof DiscoveryFeed> | null>(null);

const streamPlayback = useStreamPlayback({
  activeStreamsShelfRef,
  discoveryFeedRef,
});

const showSubtitleModal = ref(false);
const subtitleTarget = ref<{ id: string; title: string } | null>(null);
const transcribingId = ref<string | null>(null);
const retryingId = ref<string | null>(null);

function setActiveTab(tab: 'active' | 'deleted') {
  activeTab.value = tab;
  if (tab === 'deleted' && requestsStore.deletedRequests.length === 0) {
    requestsStore.fetchDeleted();
  }
}

function refreshCurrentTab() {
  if (activeTab.value === 'deleted') {
    requestsStore.fetchDeleted();
  } else {
    requestsStore.fetchAll();
  }
}

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

onMounted(async () => {
  featureFlags.ensureFlagsLoaded();
  await requestsStore.fetchAll();
  requestsStore.fetchDeleted().catch(() => {});
  if (authStore.isAdmin) {
    try {
      diskInfo.value = await api.get<DiskInfo>('/admin/disk');
    } catch {
      // Non-critical
    }
  }
});
</script>
