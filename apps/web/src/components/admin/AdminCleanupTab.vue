<template>
  <div class="space-y-8">
    <!-- Storage Quota & Media Footprint Card -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold text-white">
              Media Storage Quota
            </h2>
            <span
              v-if="diskInfo"
              class="px-2 py-0.5 rounded text-xs font-medium border"
              :class="diskInfo.quotaUsedPercent >= 100 || (diskInfo.percentFree <= diskInfo.rejectThreshold)
                ? 'bg-red-950/80 text-red-300 border-red-800'
                : diskInfo.quotaUsedPercent >= 80 || (diskInfo.percentFree <= diskInfo.warnThreshold)
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'"
            >
              {{
                diskInfo.quotaUsedPercent >= 100
                  ? 'Quota Exceeded'
                  : diskInfo.quotaUsedPercent >= 80
                    ? 'Quota Warning'
                    : 'Healthy'
              }}
            </span>
          </div>
          <p class="text-xs text-zinc-400 mt-0.5">
            Physical disk footprint of staging area and library (hardlinks deduplicated) against configured quota.
          </p>
        </div>
        <button
          type="button"
          class="text-xs text-indigo-400 hover:text-indigo-300 transition self-start sm:self-auto cursor-pointer"
          @click="$emit('switchTab', 'config')"
        >
          Configure Quota &rarr;
        </button>
      </div>

      <div
        v-if="diskInfo"
        class="space-y-3"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold text-white tracking-tight">
              {{ diskInfo.storageFootprintGb }} GB
            </span>
            <span class="text-xs text-zinc-400">
              used of <strong class="text-zinc-200">{{ diskInfo.storageQuotaGb }} GB</strong> quota
            </span>
          </div>
          <span class="text-sm font-semibold text-zinc-300">
            {{ diskInfo.quotaUsedPercent }}%
          </span>
        </div>

        <!-- Storage Quota Gauge Bar -->
        <div class="w-full bg-zinc-950 border border-zinc-800 rounded-full h-3.5 overflow-hidden p-0.5">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="diskInfo.quotaUsedPercent >= 100
              ? 'bg-red-500'
              : diskInfo.quotaUsedPercent >= 80
                ? 'bg-amber-500'
                : 'bg-indigo-500'"
            :style="{ width: `${Math.min(100, diskInfo.quotaUsedPercent)}%` }"
          />
        </div>

        <div class="flex justify-between text-[11px] text-zinc-500">
          <span>0 GB</span>
          <span class="text-amber-400">80% Warning ({{ (diskInfo.storageQuotaGb * 0.8).toFixed(0) }} GB)</span>
          <span>{{ diskInfo.storageQuotaGb }} GB</span>
        </div>

        <!-- Warning Alert Banner if near or over quota -->
        <div
          v-if="diskInfo.quotaUsedPercent >= 80"
          class="p-3 rounded-lg border text-xs flex items-start gap-2.5"
          :class="diskInfo.quotaUsedPercent >= 100
            ? 'bg-red-950/40 border-red-800 text-red-300'
            : 'bg-amber-950/40 border-amber-800 text-amber-300'"
        >
          <svg
            class="w-4 h-4 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <span class="font-semibold">
              {{ diskInfo.quotaUsedPercent >= 100 ? 'Storage Quota Exceeded!' : 'Storage Quota Warning' }}
            </span>
            <p class="text-zinc-400 text-[11px] mt-0.5">
              {{ diskInfo.quotaUsedPercent >= 100
                ? 'Storage usage has exceeded the configured quota limit. Trigger cleanup or increase quota in System Config.'
                : 'Storage usage has reached or passed 80% of configured quota. Consider cleaning old media.' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Disk Usage Card -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg font-semibold text-white">
            Media Disk Usage
          </h2>
          <p class="text-xs text-zinc-400">
            Monitored volume containing staging and library folders.
          </p>
        </div>
        <button
          type="button"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          :disabled="isRunningScan"
          @click="$emit('runScan')"
        >
          <svg
            v-if="isRunningScan"
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
          <span>{{ isRunningScan ? 'Scanning...' : 'Run Cleanup Scan' }}</span>
        </button>
      </div>

      <div
        v-if="diskInfo"
        class="space-y-3"
      >
        <div class="flex items-center justify-between text-sm">
          <span class="text-zinc-300 font-medium">Free Storage: {{ diskInfo.percentFree }}%</span>
          <span class="text-zinc-400 text-xs">Used: {{ diskInfo.percentUsed }}%</span>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-zinc-950 border border-zinc-800 rounded-full h-3 overflow-hidden">
          <div
            class="h-3 rounded-full transition-all duration-500"
            :class="diskInfo.percentFree <= diskInfo.rejectThreshold
              ? 'bg-red-500'
              : diskInfo.percentFree <= diskInfo.warnThreshold
                ? 'bg-amber-500'
                : 'bg-emerald-500'"
            :style="{ width: `${diskInfo.percentUsed}%` }"
          />
        </div>

        <div class="flex justify-between text-[11px] text-zinc-500">
          <span>0%</span>
          <span class="text-amber-400">Warn Threshold: &lt; {{ diskInfo.warnThreshold }}% Free</span>
          <span class="text-red-400">Reject Threshold: &lt; {{ diskInfo.rejectThreshold }}% Free</span>
          <span>100%</span>
        </div>
      </div>
    </div>

    <!-- Scan feedback alert -->
    <div
      v-if="scanFeedback"
      class="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm flex items-center justify-between gap-3 text-zinc-200"
    >
      <span>{{ scanFeedback }}</span>
      <button
        type="button"
        class="text-zinc-400 hover:text-white"
        @click="$emit('dismissScanFeedback')"
      >
        Dismiss
      </button>
    </div>

    <!-- Cleanup Candidates Table -->
    <div>
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-white">
          Cleanup Candidates (Priority Order)
        </h2>
        <p class="text-xs text-zinc-400">
          Ranked in deletion priority: Fully Consumed content first (oldest watched first), then least recently played / oldest requests. Items marked Keep are excluded.
        </p>
      </div>

      <div
        v-if="isLoadingCandidates"
        class="h-40 bg-zinc-900/60 border border-zinc-800 rounded-xl animate-pulse"
      />

      <div
        v-else-if="candidatesList.length === 0"
        class="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center text-sm text-zinc-500"
      >
        No items currently eligible for cleanup. All seeding items are protected or kept.
      </div>

      <div
        v-else
        class="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-lg"
      >
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <th class="py-3 px-4 sm:px-6">
                Media Title
              </th>
              <th class="py-3 px-4">
                Type
              </th>
              <th class="py-3 px-4">
                Last Played
              </th>
              <th class="py-3 px-4">
                Size
              </th>
              <th class="py-3 px-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/70 text-zinc-200">
            <template
              v-for="cand in candidatesList"
              :key="cand.id"
            >
              <tr class="hover:bg-zinc-800/30 transition">
                <td class="py-3.5 px-4 sm:px-6">
                  <div class="flex items-center gap-2">
                    <div class="font-medium text-white">
                      {{ cand.title }}
                    </div>
                    <span
                      v-if="cand.isFullyConsumed"
                      class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                      title="Fully Consumed"
                    >
                      Fully Consumed
                    </span>
                  </div>
                  <div class="text-xs text-zinc-500">
                    <span v-if="formatMediaSubtitle(cand)">{{ formatMediaSubtitle(cand) }}</span>
                    <span
                      v-if="cand.scheduledDeleteAt"
                      class="ml-2 text-amber-400 font-semibold"
                    >
                      Scheduled for deletion: {{ formatDate(cand.scheduledDeleteAt) }}
                    </span>
                  </div>
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {{ formatMediaType(cand.mediaType) }}
                  </span>
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-400">
                  {{ cand.lastPlayedAt ? formatDate(cand.lastPlayedAt) : 'Never played' }}
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-zinc-400">
                  {{ formatSpeed(cand.sizeBytes || 0).replace('/s', '') }}
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      v-if="isSeasonPack(cand)"
                      type="button"
                      :data-testid="`toggle-episodes-${cand.id}`"
                      class="px-2.5 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer"
                      :class="expandedEpisodeId === cand.id
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'"
                      @click="toggleEpisodes(cand.id)"
                    >
                      {{ expandedEpisodeId === cand.id ? 'Hide Episodes' : 'Episodes' }}
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs font-medium bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800 rounded-lg transition cursor-pointer"
                      @click="$emit('cleanItem', cand)"
                    >
                      Clean Now
                    </button>
                  </div>
                </td>
              </tr>
              <tr
                v-if="expandedEpisodeId === cand.id"
                :key="`episodes-${cand.id}`"
                class="bg-zinc-950/50"
              >
                <td
                  colspan="5"
                  class="p-4 bg-zinc-950/80 border-b border-zinc-800"
                >
                  <SeasonPackEpisodesDrawer
                    :request-id="cand.id"
                    :media-title="cand.title"
                    :is-admin="true"
                    @close="expandedEpisodeId = null"
                    @episode-pruned="handleEpisodePruned"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { DownloadRequest, MediaType } from '../../stores/requests';
import SeasonPackEpisodesDrawer from '../requests/SeasonPackEpisodesDrawer.vue';

const expandedEpisodeId = ref<string | null>(null);

function isSeasonPack(cand: DownloadRequest): boolean {
  return (cand.mediaType === 'tv_show' || cand.mediaType === 'anime') &&
    cand.seasonNumber !== null &&
    cand.seasonNumber !== undefined &&
    cand.episodeNumber == null;
}

function toggleEpisodes(id: string) {
  expandedEpisodeId.value = expandedEpisodeId.value === id ? null : id;
}

export interface DiskInfo {
  percentFree: number;
  percentUsed: number;
  warnThreshold: number;
  rejectThreshold: number;
  storageQuotaGb: number;
  storageQuotaBytes: number;
  storageFootprintBytes: number;
  storageFootprintGb: number;
  quotaUsedPercent: number;
}

defineProps<{
  diskInfo: DiskInfo | null;
  isRunningScan: boolean;
  scanFeedback: string | null;
  candidatesList: DownloadRequest[];
  isLoadingCandidates: boolean;
  formatMediaType: (type: MediaType) => string;
  formatMediaSubtitle: (req: DownloadRequest) => string;
  formatDate: (date: string) => string;
  formatSpeed: (bytesPerSec: number) => string;
}>();

const emit = defineEmits<{
  (e: 'switchTab', tab: 'config'): void;
  (e: 'runScan'): void;
  (e: 'dismissScanFeedback'): void;
  (e: 'cleanItem', cand: DownloadRequest): void;
  (e: 'refresh'): void;
}>();

function handleEpisodePruned(payload: { episodeId: string; wholeRequestDeleted: boolean }) {
  if (payload.wholeRequestDeleted) {
    expandedEpisodeId.value = null;
  }
  emit('refresh');
}
</script>
