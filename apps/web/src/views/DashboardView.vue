<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <!-- Navbar -->
    <Navbar />

    <!-- Main Content -->
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

      <!-- Up Next Shelf (Active Episodic Series) -->
      <UpNextShelf />

      <!-- Discovery Feed Shelf (Curated Quality Releases) -->
      <DiscoveryFeed />

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
            :disabled="requestsStore.loading"
            title="Refresh List"
            @click="requestsStore.fetchAll"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': requestsStore.loading }"
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

      <!-- Admin Storage Quota Summary Banner (User Story 3) -->
      <div
        v-if="authStore.isAdmin && diskInfo"
        class="mb-6 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0">
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16m-5 4h.01m-4 0h.01m-4 0h.01"
              />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Media Storage Quota</span>
              <span
                class="px-2 py-0.5 rounded text-[11px] font-medium border"
                :class="diskInfo.quotaUsedPercent >= 100 || diskInfo.percentFree <= diskInfo.rejectThreshold
                  ? 'bg-red-950/80 text-red-300 border-red-800'
                  : diskInfo.quotaUsedPercent >= 80 || diskInfo.percentFree <= diskInfo.warnThreshold
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'"
              >
                {{ diskInfo.quotaUsedPercent >= 100 ? 'Quota Exceeded' : diskInfo.quotaUsedPercent >= 80 ? 'Quota Warning' : 'Healthy' }}
              </span>
            </div>
            <p class="text-sm font-semibold text-white mt-0.5">
              {{ diskInfo.storageFootprintGb }} GB <span class="text-xs font-normal text-zinc-400">used of</span> {{ diskInfo.storageQuotaGb }} GB <span class="text-xs font-normal text-zinc-400">quota ({{ diskInfo.quotaUsedPercent }}%)</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4 min-w-[240px] max-w-sm flex-1">
          <div class="w-full bg-zinc-950 border border-zinc-800 rounded-full h-2.5 overflow-hidden p-0.5">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="diskInfo.quotaUsedPercent >= 100
                ? 'bg-red-500'
                : diskInfo.quotaUsedPercent >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'"
              :style="{ width: `${Math.min(100, Math.max(0, diskInfo.quotaUsedPercent))}%` }"
            />
          </div>
          <router-link
            to="/admin"
            class="text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap transition cursor-pointer"
          >
            Manage &rarr;
          </router-link>
        </div>
      </div>

      <!-- Loading skeleton -->
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

      <!-- Empty state -->
      <div
        v-else-if="requestsStore.requests.length === 0"
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

      <!-- Requests List / Table -->
      <div
        v-else
        class="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xl"
      >
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th class="py-3.5 px-4 sm:px-6">
                  Media
                </th>
                <th class="py-3.5 px-4">
                  Type
                </th>
                <th class="py-3.5 px-4">
                  Status
                </th>
                <th class="py-3.5 px-4 min-w-[200px]">
                  Progress / Details
                </th>
                <th
                  v-if="authStore.isAdmin"
                  class="py-3.5 px-4"
                >
                  Requester
                </th>
                <th class="py-3.5 px-4">
                  Requested
                </th>
                <th class="py-3.5 px-4 text-center">
                  Keep
                </th>
                <th class="py-3.5 px-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/70 text-zinc-200">
              <tr
                v-for="item in requestsStore.requests"
                :key="item.id"
                class="hover:bg-zinc-800/30 transition group"
              >
                <!-- Title & Metadata -->
                <td class="py-4 px-4 sm:px-6">
                  <div class="font-medium text-white text-base">
                    {{ item.title }}
                  </div>
                  <div class="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                    <span v-if="formatMediaSubtitle(item)">{{ formatMediaSubtitle(item) }}</span>
                    <span
                      v-if="item.scheduledDeleteAt"
                      class="text-amber-400 font-medium"
                    >
                      (Auto-delete scheduled: {{ formatDate(item.scheduledDeleteAt) }})
                    </span>
                  </div>
                </td>

                <!-- Media Type Badge -->
                <td class="py-4 px-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                    {{ formatMediaType(item.mediaType) }}
                  </span>
                </td>

                <!-- Status Badge -->
                <td class="py-4 px-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                    :class="getStatusBadgeClass(item)"
                  >
                    <span
                      v-if="item.status === 'downloading'"
                      class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"
                    />
                    {{ formatStatusLabel(item) }}
                  </span>
                </td>

                <!-- Progress Bar & Speed / ETA -->
                <td class="py-4 px-4">
                  <div
                    v-if="item.status === 'downloading'"
                    class="space-y-1.5"
                  >
                    <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        :style="{ width: `${getProgressPercent(item.id)}%` }"
                      />
                    </div>
                    <div class="flex justify-between items-center text-[11px] text-zinc-400 font-mono">
                      <span>{{ getProgressPercent(item.id) }}%</span>
                      <span>{{ getProgressSpeedEta(item.id) }}</span>
                    </div>
                  </div>

                  <div
                    v-else-if="item.status === 'queued'"
                    class="text-xs flex items-center gap-1.5"
                    :class="item.deferredReason === 'waiting_for_space' ? 'text-amber-400/90' : 'text-blue-400/90'"
                  >
                    <span>
                      {{ item.deferredReason === 'waiting_for_space' ? 'Waiting for storage quota headroom' : 'Waiting for available download slot' }}
                    </span>
                  </div>

                  <div
                    v-else-if="item.status === 'error'"
                    class="text-xs text-red-400 max-w-xs truncate"
                    :title="item.errorMessage || 'Unknown error occurred'"
                  >
                    {{ item.errorMessage || 'Download error' }}
                  </div>

                  <div
                    v-else-if="item.status === 'seeding'"
                    class="text-xs text-emerald-400/90 flex items-center gap-1"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>In Jellyfin library</span>
                  </div>

                  <div
                    v-else
                    class="text-xs text-zinc-500"
                  >
                    —
                  </div>
                </td>

                <!-- Requester (Admin View) -->
                <td
                  v-if="authStore.isAdmin"
                  class="py-4 px-4 text-xs text-zinc-400"
                >
                  <div
                    v-if="item.coRequesters && item.coRequesters.length > 0"
                    data-testid="admin-requester-group"
                    class="flex items-center gap-1.5 flex-wrap"
                  >
                    <span class="font-medium text-zinc-200" title="Primary requester">
                      {{ item.requesterUsername || item.userId.slice(0, 8) }}
                    </span>
                    <span class="text-zinc-500 text-[11px] font-normal">+</span>
                    <span
                      v-for="coReq in item.coRequesters"
                      :key="coReq"
                      data-testid="co-requester-badge"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 text-[11px]"
                      :title="`${coReq} (co-requester)`"
                    >
                      <span>{{ coReq }}</span>
                      <span class="text-[9px] uppercase tracking-wider text-indigo-400 font-semibold">(co-req)</span>
                    </span>
                  </div>
                  <span v-else class="whitespace-nowrap">
                    {{ item.requesterUsername || item.userId.slice(0, 8) }}
                  </span>
                </td>

                <!-- Requested Date -->
                <td class="py-4 px-4 whitespace-nowrap text-xs text-zinc-400">
                  {{ formatDate(item.requestedAt) }}
                </td>

                <!-- Keep Flag Toggle (Admin Only) -->
                <td class="py-4 px-4 whitespace-nowrap text-center">
                  <button
                    v-if="authStore.isAdmin && item.isPrimaryRequester !== false"
                    type="button"
                    class="p-1.5 rounded-lg border transition cursor-pointer disabled:opacity-50"
                    :class="item.keepFlag
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                      : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'"
                    :title="item.keepFlag ? 'Item marked Keep (immune to auto-cleanup)' : 'Enable Keep flag to protect from auto-cleanup'"
                    @click="handleToggleKeep(item)"
                  >
                    <svg
                      class="w-4 h-4"
                      :fill="item.keepFlag ? 'currentColor' : 'none'"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                  <span
                    v-else-if="item.keepFlag"
                    class="text-amber-400 text-xs font-medium"
                  >
                    Yes
                  </span>
                  <span
                    v-else
                    class="text-zinc-600 text-xs"
                  >
                    No
                  </span>
                </td>

                <!-- Actions (Delete) -->
                <td class="py-4 px-4 whitespace-nowrap text-right">
                  <button
                    v-if="canDelete(item)"
                    type="button"
                    class="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                    title="Delete Request"
                    @click="promptDelete(item)"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="itemToDelete"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div class="flex items-center gap-3 text-red-400 mb-3">
          <div class="w-10 h-10 rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center shrink-0">
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">
              Delete Download Request?
            </h3>
          </div>
        </div>

        <p class="text-sm text-zinc-300 mb-2">
          Are you sure you want to delete <strong class="text-white">{{ itemToDelete.title }}</strong>?
        </p>
        <p class="text-xs text-zinc-500 mb-6">
          This will remove the torrent from qBittorrent and delete media files from the library. This action cannot be undone.
        </p>

        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            :disabled="isDeleting"
            @click="itemToDelete = null"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            :disabled="isDeleting"
            @click="executeDelete"
          >
            <svg
              v-if="isDeleting"
              class="animate-spin h-4 w-4 text-white"
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
            <span>{{ isDeleting ? 'Deleting...' : 'Confirm Delete' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Navbar from '../components/Navbar.vue';
import UpNextShelf from '../components/UpNextShelf.vue';
import DiscoveryFeed from '../components/DiscoveryFeed.vue';
import { useAuthStore } from '../stores/auth';
import { useRequestsStore, DownloadRequest } from '../stores/requests';
import { api } from '../lib/api';
import {
  formatSpeed,
  formatEta,
  formatMediaType,
  formatDate,
  formatMediaSubtitle,
} from '../lib/formatters';

interface DiskInfo {
  storageQuotaGb: number;
  storageFootprintGb: number;
  quotaUsedPercent: number;
  percentFree: number;
  warnThreshold: number;
  rejectThreshold: number;
}

const authStore = useAuthStore();
const requestsStore = useRequestsStore();

const itemToDelete = ref<DownloadRequest | null>(null);
const isDeleting = ref(false);
const diskInfo = ref<DiskInfo | null>(null);

onMounted(async () => {
  await requestsStore.fetchAll();
  if (authStore.isAdmin) {
    try {
      diskInfo.value = await api.get<DiskInfo>('/admin/disk');
    } catch {
      // Non-critical, ignore if fails
    }
  }
});

function canDelete(item: DownloadRequest): boolean {
  if (item.isPrimaryRequester === false) return false;
  if (authStore.isAdmin) return true;
  return item.userId === authStore.user?.id;
}

function promptDelete(item: DownloadRequest) {
  itemToDelete.value = item;
}

async function executeDelete() {
  if (!itemToDelete.value) return;
  isDeleting.value = true;
  try {
    await requestsStore.deleteRequest(itemToDelete.value.id);
    itemToDelete.value = null;
  } catch {
    // Error handling
  } finally {
    isDeleting.value = false;
  }
}

async function handleToggleKeep(item: DownloadRequest) {
  try {
    await requestsStore.toggleKeep(item.id);
  } catch {
    // Silent or handled
  }
}

function getProgressPercent(requestId: string): number {
  const p = requestsStore.progressMap[requestId];
  if (!p) return 0;
  return Math.min(100, Math.max(0, Math.round(p.progress * 100)));
}

function getProgressSpeedEta(requestId: string): string {
  const p = requestsStore.progressMap[requestId];
  if (!p) return '—';
  const speed = formatSpeed(p.speedBps);
  const eta = formatEta(p.etaSeconds);
  return `${speed} — ETA ${eta}`;
}

function formatStatusLabel(item: DownloadRequest): string {
  if (item.status === 'queued') {
    if (item.deferredReason === 'waiting_for_space') {
      return 'Queued (Waiting for Space)';
    }
    return 'Queued (Waiting for Slot)';
  }
  return item.status;
}

function getStatusBadgeClass(item: DownloadRequest): string {
  if (item.status === 'queued') {
    if (item.deferredReason === 'waiting_for_space') {
      return 'bg-amber-950/60 text-amber-400 border-amber-800';
    }
    return 'bg-blue-950/50 text-blue-300 border-blue-800/80';
  }
  switch (item.status) {
    case 'downloading':
      return 'bg-blue-950/60 text-blue-400 border-blue-800';
    case 'hardlinking':
      return 'bg-indigo-950/60 text-indigo-400 border-indigo-800';
    case 'seeding':
      return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
    case 'done':
      return 'bg-green-950/60 text-green-400 border-green-800';
    case 'error':
      return 'bg-red-950/60 text-red-400 border-red-800';
    case 'deleted':
      return 'bg-zinc-900 text-zinc-500 border-zinc-800';
    default:
      return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  }
}
</script>
