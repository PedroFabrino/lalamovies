<template>
  <div class="space-y-4">
    <!-- Source summary / Release Recommendation -->
    <div v-if="inputMode === 'search'" class="space-y-4">
      <!-- Loading state -->
      <div v-if="isSearchingReleases" class="p-8 border border-zinc-800 rounded-xl bg-zinc-950/60 text-center">
        <svg class="animate-spin h-6 w-6 text-indigo-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p class="text-sm font-medium text-zinc-300">Searching indexers for "{{ selectedCandidate?.title }}"...</p>
        <p class="text-xs text-zinc-500 mt-1">Ranking 1080p releases, health, and file sizes via Prowlarr</p>
      </div>

      <!-- In-Place Manual Fallback Card (when isManualFallbackInStep3 is true) -->
      <Step3ManualFallback
        v-if="isManualFallbackInStep3"
        :selected-candidate="selectedCandidate"
        :manual-fallback-mode="manualFallbackMode"
        :fallback-magnet-link="fallbackMagnetLink"
        :fallback-file="fallbackFile"
        @update:manual-fallback-mode="$emit('update:manualFallbackMode', $event)"
        @update:fallback-magnet-link="$emit('update:fallbackMagnetLink', $event)"
        @cancel="$emit('update:isManualFallbackInStep3', false)"
        @handle-fallback-file-change="$emit('handleFallbackFileChange', $event)"
      />

      <!-- Low-Health Warning Alert -->
      <div
        v-else-if="!hasHealthyReleases && releaseCandidates.length > 0 && !selectedRelease"
        data-testid="low-health-warning"
        class="p-5 border border-amber-800/80 bg-amber-950/30 rounded-xl space-y-3"
      >
        <div class="flex items-start gap-3">
          <span class="text-xl">⚠️</span>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-amber-200">
              No Healthy Releases Found (All &lt; 5 seeders)
            </h4>
            <p class="text-xs text-amber-300/80 mt-1">
              Found {{ releaseCandidates.length }} release(s), but none have sufficient seeders. Downloading sub-threshold torrents may stall or take days.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            data-testid="switch-to-manual-upload-lowhealth"
            class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            @click="$emit('switchToManualUpload')"
          >
            <span>⚡ Switch to Manual Upload</span>
          </button>
          <button
            type="button"
            data-testid="toggle-low-health-anyway"
            class="px-3.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-amber-700/60 text-amber-200 rounded-lg text-xs font-medium transition cursor-pointer"
            @click="$emit('update:showLowHealthAnyway', !showLowHealthAnyway)"
          >
            {{ showLowHealthAnyway ? 'Hide low-health releases' : 'Show low-health releases anyway' }}
          </button>
        </div>
      </div>

      <!-- Active Selected Release Card -->
      <div
        v-if="!isManualFallbackInStep3 && activeRelease"
        class="p-5 border rounded-xl space-y-3 transition"
        :class="activeRelease.guid === recommendedRelease?.guid
          ? 'border-indigo-500/50 bg-indigo-950/20'
          : 'border-emerald-500/60 bg-emerald-950/20'"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              class="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider"
              :class="activeRelease.guid === recommendedRelease?.guid
                ? 'bg-indigo-950 border border-indigo-700/80 text-indigo-300'
                : 'bg-emerald-950 border border-emerald-700/80 text-emerald-300'"
            >
              {{ activeRelease.guid === recommendedRelease?.guid ? 'Recommended Release' : 'Custom Selected Release' }}
            </span>
            <span class="text-xs font-mono text-zinc-400">
              via {{ activeRelease.indexer }}
            </span>
            <span
              v-if="activeRelease.isPreferred"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-950/80 border border-teal-700/80 text-teal-300 text-xs font-semibold"
              data-testid="badge-preferred-recommended"
            >
              <span>⭐</span>
              <span>BJ-Share Preferred</span>
            </span>
            <span
              v-if="activeRelease.isPrivateTracker"
              class="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[10px] font-bold uppercase tracking-wider"
              title="Private tracker — cloud streaming barred"
              data-testid="badge-private-tracker-active"
            >
              🔒 Private
            </span>
            <span
              v-else-if="activeRelease.isInfringing"
              class="px-2 py-0.5 rounded bg-red-950/80 border border-red-700/80 text-red-300 text-[10px] font-bold tracking-wider flex items-center gap-1"
              title="Real-Debrid DMCA takedown — streaming blocked"
              data-testid="badge-dmca-blocked-active"
            >
              🚫 DMCA Blocked
            </span>
            <span
              v-else-if="isStreamingEnabled && getCandidateCacheStatus(activeRelease) === true"
              class="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-bold tracking-wider flex items-center gap-1"
              title="Cached in Real-Debrid — ready for instant stream"
              data-testid="badge-instant-cached-active"
            >
              ⚡ Instant Stream
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="activeRelease.guid !== recommendedRelease?.guid && recommendedRelease"
              type="button"
              class="text-xs text-zinc-400 hover:text-indigo-300 underline cursor-pointer"
              @click="$emit('resetToRecommendedRelease')"
            >
              Reset to recommended
            </button>
            <button
              type="button"
              data-testid="switch-to-manual-upload-active"
              class="text-xs text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
              @click="$emit('switchToManualUpload')"
            >
              Use custom torrent file / magnet
            </button>
          </div>
        </div>

        <h4 class="text-sm font-mono text-white font-medium break-all leading-snug">
          {{ activeRelease.title }}
        </h4>

        <div class="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span class="px-2 py-0.5 rounded bg-zinc-800 text-emerald-300 border border-zinc-700 font-medium">
            {{ activeRelease.resolution }}
          </span>
          <span v-if="activeRelease.codec !== 'unknown'" class="px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700 font-medium">
            {{ activeRelease.codec }}
          </span>
          <span v-if="activeRelease.source !== 'unknown'" class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
            {{ activeRelease.source }}
          </span>
          <span class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
            {{ activeRelease.formattedSize }}
          </span>
          <span
            class="px-2 py-0.5 rounded border font-medium flex items-center gap-1"
            :class="activeRelease.isLowHealth
              ? 'bg-amber-950/50 border-amber-800/60 text-amber-300'
              : 'bg-zinc-800 border-zinc-700 text-emerald-400'"
          >
            <span>{{ activeRelease.seeders }} seeders</span>
            <span class="text-zinc-500">•</span>
            <span>{{ activeRelease.leechers }} leechers</span>
          </span>

          <span
            v-if="activeRelease.isInfringing"
            class="ml-auto px-2.5 py-1 rounded text-xs font-medium bg-red-950/60 border border-red-800/60 text-red-400 flex items-center gap-1 cursor-not-allowed"
            title="This release has been taken down on Real-Debrid (DMCA infringing file)"
            data-testid="badge-dmca-blocked-active-btn"
          >
            <span>🚫</span>
            <span>DMCA Blocked</span>
          </span>
          <button
            v-else-if="isStreamingEnabled && !activeRelease.isPrivateTracker"
            type="button"
            class="ml-auto px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5"
            :class="getCandidateCacheStatus(activeRelease) === true
              ? 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-zinc-950 shadow-sm'
              : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'"
            title="Stream instantly via cloud debrid"
            data-testid="button-instant-stream-active"
            @click.stop="$emit('handleInstantStreamCandidate', activeRelease)"
          >
            <span>⚡</span>
            <span>{{ getCandidateCacheStatus(activeRelease) === true ? 'Instant Stream' : 'Stream' }}</span>
          </button>
        </div>
      </div>

      <!-- Release Candidate Explorer (Expandable Drawer) -->
      <ReleaseExplorerDrawer
        v-if="!isManualFallbackInStep3 && releaseCandidates.length > 0 && (hasHealthyReleases || showLowHealthAnyway || selectedRelease)"
        :release-candidates="releaseCandidates"
        :selected-release="selectedRelease"
        :recommended-release="recommendedRelease"
        :is-explorer-expanded="isExplorerExpanded"
        :candidate-sort-by="candidateSortBy"
        :sort-options="sortOptions"
        :hide-infringing="hideInfringing"
        :infringing-count="infringingCount"
        :sorted-release-candidates="sortedReleaseCandidates"
        :is-streaming-enabled="isStreamingEnabled"
        :get-candidate-cache-status="getCandidateCacheStatus"
        @update:is-explorer-expanded="$emit('update:isExplorerExpanded', $event)"
        @update:candidate-sort-by="$emit('update:candidateSortBy', $event)"
        @update:hide-infringing="$emit('update:hideInfringing', $event)"
        @select-release="$emit('selectRelease', $event)"
        @handle-instant-stream-candidate="$emit('handleInstantStreamCandidate', $event)"
      />

      <!-- Prowlarr not configured or unreachable -->
      <div
        v-else-if="!isManualFallbackInStep3 && (!isProwlarrConfigured || !isProwlarrReachable)"
        data-testid="prowlarr-offline-alert"
        class="p-5 border border-amber-800/60 bg-amber-950/30 rounded-xl space-y-3"
      >
        <div class="flex items-start gap-3">
          <span class="text-xl">⚠️</span>
          <div>
            <h4 class="text-sm font-semibold text-amber-200">
              {{ !isProwlarrConfigured ? 'Prowlarr is not configured' : 'Prowlarr is unreachable' }}
            </h4>
            <p class="text-xs text-amber-300/80 mt-1">
              {{ !isProwlarrConfigured
                ? 'Please set PROWLARR_API_KEY on the server to enable automated release search.'
                : 'Unable to connect to the Prowlarr indexer server. You can still supply a magnet link or .torrent file manually.' }}
            </p>
          </div>
        </div>
        <button
          type="button"
          data-testid="switch-to-manual-upload-offline"
          class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
          @click="$emit('switchToManualUpload')"
        >
          <span>⚡ Switch to Manual Upload</span>
        </button>
      </div>

      <!-- No releases found -->
      <div
        v-else-if="!isManualFallbackInStep3 && releaseCandidates.length === 0"
        data-testid="no-releases-alert"
        class="p-5 border border-zinc-800 bg-zinc-950/60 rounded-xl space-y-3"
      >
        <div>
          <h4 class="text-sm font-semibold text-zinc-200">No releases found automatically</h4>
          <p class="text-xs text-zinc-400 mt-1">
            Prowlarr returned no matching torrents for this title. You can supply a magnet link or .torrent file manually while keeping the confirmed metadata.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="switch-to-manual-upload-noreleases"
            class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            @click="$emit('switchToManualUpload')"
          >
            <span>⚡ Switch to Manual Upload</span>
          </button>
          <button
            type="button"
            data-testid="add-to-waitlist-banner-btn"
            class="px-3.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            @click="$emit('navigateToWaitlistWithMetadata')"
          >
            <span>⏳ No releases found yet — Add to Waitlist instead</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Source summary for magnet/file modes -->
    <div v-else class="text-xs text-zinc-500 break-all bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
      <span class="text-zinc-400 font-semibold">{{ inputMode === 'file' ? 'Torrent File:' : 'Magnet:' }}</span>
      {{ inputMode === 'file' ? (validBatchItems[0]?.fileName || selectedFile?.name) : (magnetLink.length > 80 ? magnetLink.slice(0, 80) + '...' : magnetLink) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import ReleaseExplorerDrawer from './ReleaseExplorerDrawer.vue';
import Step3ManualFallback from './Step3ManualFallback.vue';
import type { MetadataCandidate, BatchItem } from '../../views/RequestView.vue';
import type { ReleaseCandidate, CandidateSortOption } from '../../lib/releaseExplorer';

defineProps<{
  inputMode: 'search' | 'magnet' | 'file';
  isSearchingReleases: boolean;
  selectedCandidate: MetadataCandidate | null;
  isManualFallbackInStep3: boolean;
  manualFallbackMode: 'magnet' | 'file';
  fallbackMagnetLink: string;
  fallbackFile: File | null;
  hasHealthyReleases: boolean;
  releaseCandidates: ReleaseCandidate[];
  selectedRelease: ReleaseCandidate | null;
  showLowHealthAnyway: boolean;
  activeRelease: ReleaseCandidate | null;
  recommendedRelease: ReleaseCandidate | null;
  isStreamingEnabled: boolean;
  isExplorerExpanded: boolean;
  candidateSortBy: CandidateSortOption;
  sortOptions: readonly { value: CandidateSortOption; label: string }[];
  hideInfringing: boolean;
  infringingCount: number;
  sortedReleaseCandidates: ReleaseCandidate[];
  isProwlarrConfigured: boolean;
  isProwlarrReachable: boolean;
  validBatchItems: BatchItem[];
  selectedFile: File | null;
  magnetLink: string;
  formatBytes: (bytes: number) => string;
  getCandidateCacheStatus: (c: ReleaseCandidate) => boolean | undefined;
}>();

defineEmits<{
  (e: 'update:isManualFallbackInStep3', val: boolean): void;
  (e: 'update:manualFallbackMode', val: 'magnet' | 'file'): void;
  (e: 'update:fallbackMagnetLink', val: string): void;
  (e: 'handleFallbackFileChange', event: Event): void;
  (e: 'switchToManualUpload'): void;
  (e: 'update:showLowHealthAnyway', val: boolean): void;
  (e: 'resetToRecommendedRelease'): void;
  (e: 'handleInstantStreamCandidate', candidate: ReleaseCandidate): void;
  (e: 'update:isExplorerExpanded', val: boolean): void;
  (e: 'update:candidateSortBy', val: CandidateSortOption): void;
  (e: 'update:hideInfringing', val: boolean): void;
  (e: 'selectRelease', candidate: ReleaseCandidate): void;
  (e: 'navigateToWaitlistWithMetadata'): void;
}>();
</script>
