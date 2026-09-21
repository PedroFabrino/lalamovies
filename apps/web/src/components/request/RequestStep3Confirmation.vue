<template>
  <div
    v-if="selectedCandidate"
    class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl space-y-6"
  >
    <div>
      <h2 class="text-lg font-semibold text-white">
        Confirm Download Request
      </h2>
      <p class="text-xs text-zinc-400 mt-0.5">
        Review the media details below before starting the download.
      </p>
    </div>

    <!-- Error Alert (Disk Space 422 or General) -->
    <DiskSpaceAlert :error="step3Error" />

    <!-- Selected match preview card -->
    <Step3MetadataCard
      :selected-candidate="selectedCandidate"
      :media-type="mediaType"
      :active-anime-title="activeAnimeTitle"
      :has-cjk="hasCjk"
      :format-media-type="formatMediaType"
      @set-anime-title="$emit('setAnimeTitle', $event)"
    />

    <!-- Batch Torrent List / Summary (if batch mode active) -->
    <Step3BatchSummary
      v-if="inputMode === 'file'"
      :valid-batch-items="validBatchItems"
      :batch-season-input="batchSeasonInput"
      :total-batch-size="totalBatchSize"
      :format-bytes="formatBytes"
      @update:batch-season-input="$emit('update:batchSeasonInput', $event)"
      @apply-season-to-all="$emit('applySeasonToAll')"
      @remove-batch-item="$emit('removeBatchItem', $event)"
    />

    <!-- Episodic Download Scope / Granularity -->
    <Step3EpisodicScope
      :media-type="mediaType"
      :download-granularity="downloadGranularity"
      :season-number="seasonNumber"
      :episode-number="episodeNumber"
      :waitlist-next-season="waitlistNextSeason"
      :watch-for-next-episodes="watchForNextEpisodes"
      :notify-before-each-download="notifyBeforeEachDownload"
      @granularity-change="$emit('granularityChange', $event)"
      @season-or-episode-change="$emit('seasonOrEpisodeChange')"
      @update:season-number="$emit('update:seasonNumber', $event)"
      @update:episode-number="$emit('update:episodeNumber', $event)"
      @update:waitlist-next-season="$emit('update:waitlistNextSeason', $event)"
      @update:watch-for-next-episodes="$emit('update:watchForNextEpisodes', $event)"
      @update:notify-before-each-download="$emit('update:notifyBeforeEachDownload', $event)"
    />

    <!-- Duplicate Request Confirmation Banner (Ticket 04) -->
    <div
      v-if="existingRequest"
      data-testid="duplicate-already-exists-banner"
      class="p-5 sm:p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-4"
    >
      <div class="flex items-start gap-4">
        <div class="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
          <svg
            class="w-6 h-6"
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
        </div>
        <div class="flex-1">
          <h3 class="text-base font-semibold text-white">
            Already in your library — check your dashboard
          </h3>
          <p class="text-sm text-zinc-300 mt-1">
            This content is already {{ existingRequest.status === 'completed' ? 'downloaded' : 'in progress' }} in the system.
            Confirming will add it directly to your dashboard to track without downloading a duplicate copy.
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-400 font-medium">
            <span class="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 uppercase tracking-wider">
              Status: {{ existingRequest.status }}
            </span>
            <span
              v-if="existingRequest.seasonNumber != null"
              class="text-zinc-400"
            >
              Season {{ existingRequest.seasonNumber }}
              <span v-if="existingRequest.episodeNumber != null"> • Episode {{ existingRequest.episodeNumber }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Release Selection and Explorer Section -->
    <Step3ReleaseSection
      v-else
      :input-mode="inputMode"
      :is-searching-releases="isSearchingReleases"
      :selected-candidate="selectedCandidate"
      :is-manual-fallback-in-step3="isManualFallbackInStep3"
      :manual-fallback-mode="manualFallbackMode"
      :fallback-magnet-link="fallbackMagnetLink"
      :fallback-file="fallbackFile"
      :has-healthy-releases="hasHealthyReleases"
      :release-candidates="releaseCandidates"
      :selected-release="selectedRelease"
      :show-low-health-anyway="showLowHealthAnyway"
      :active-release="activeRelease"
      :recommended-release="recommendedRelease"
      :is-streaming-enabled="isStreamingEnabled"
      :is-explorer-expanded="isExplorerExpanded"
      :candidate-sort-by="candidateSortBy"
      :sort-options="sortOptions"
      :hide-infringing="hideInfringing"
      :infringing-count="infringingCount"
      :sorted-release-candidates="sortedReleaseCandidates"
      :is-prowlarr-configured="isProwlarrConfigured"
      :is-prowlarr-reachable="isProwlarrReachable"
      :valid-batch-items="validBatchItems"
      :selected-file="selectedFile"
      :magnet-link="magnetLink"
      :format-bytes="formatBytes"
      :get-candidate-cache-status="getCandidateCacheStatus"
      @update:is-manual-fallback-in-step3="$emit('update:isManualFallbackInStep3', $event)"
      @update:manual-fallback-mode="$emit('update:manualFallbackMode', $event)"
      @update:fallback-magnet-link="$emit('update:fallbackMagnetLink', $event)"
      @handle-fallback-file-change="$emit('handleFallbackFileChange', $event)"
      @switch-to-manual-upload="$emit('switchToManualUpload')"
      @update:show-low-health-anyway="$emit('update:showLowHealthAnyway', $event)"
      @reset-to-recommended-release="$emit('resetToRecommendedRelease')"
      @handle-instant-stream-candidate="$emit('handleInstantStreamCandidate', $event)"
      @update:is-explorer-expanded="$emit('update:isExplorerExpanded', $event)"
      @update:candidate-sort-by="$emit('update:candidateSortBy', $event)"
      @update:hide-infringing="$emit('update:hideInfringing', $event)"
      @select-release="$emit('selectRelease', $event)"
      @navigate-to-waitlist-with-metadata="$emit('navigateToWaitlistWithMetadata')"
    />

    <!-- Navigation / Action Footer -->
    <div class="flex items-center justify-between pt-4 border-t border-zinc-800">
      <button
        type="button"
        :disabled="isSubmitting"
        class="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer disabled:opacity-50"
        @click="$emit('back')"
      >
        Back
      </button>
      <button
        type="button"
        :disabled="!isManualTorrentsEnabled || isSubmitting || isCheckingExists || (!existingRequest && ((inputMode === 'file' && validBatchItems.length === 0) || (inputMode === 'magnet' && !magnetLink.trim()) || (inputMode === 'search' && (isSearchingReleases || (isManualFallbackInStep3 ? (manualFallbackMode === 'magnet' ? !fallbackMagnetLink.trim() : !fallbackFile) : (!selectedRelease && !recommendedRelease))))))"
        class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        @click="$emit('confirm')"
      >
        <svg
          v-if="isSubmitting"
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
        <span>
          {{
            isSubmitting
              ? (submitProgress.total > 1
                ? `Submitting (${submitProgress.current}/${submitProgress.total})...`
                : 'Submitting...')
              : existingRequest
                ? 'Add to My Dashboard'
                : validBatchItems.length > 1
                  ? `Confirm & Submit Batch (${validBatchItems.length} torrents)`
                  : 'Confirm & Download'
          }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import DiskSpaceAlert from './DiskSpaceAlert.vue';
import Step3MetadataCard from './Step3MetadataCard.vue';
import Step3BatchSummary from './Step3BatchSummary.vue';
import Step3EpisodicScope from './Step3EpisodicScope.vue';
import Step3ReleaseSection from './Step3ReleaseSection.vue';
import type { MediaType } from '../../stores/requests';
import type {
  MetadataCandidate,
  CanonicalRequestSummary,
  BatchItem,
  ReleaseCandidate,
} from '../../views/RequestView.vue';
import type { CandidateSortOption } from '../../lib/releaseExplorer';

defineProps<{
  selectedCandidate: MetadataCandidate | null;
  mediaType: MediaType;
  step3Error: string | null;
  existingRequest: CanonicalRequestSummary | null;
  validBatchItems: BatchItem[];
  batchSeasonInput: number | null;
  totalBatchSize: number;
  downloadGranularity: 'season' | 'episode';
  seasonNumber: number | null;
  episodeNumber: number | null;
  waitlistNextSeason: boolean;
  watchForNextEpisodes: boolean;
  notifyBeforeEachDownload: boolean;
  inputMode: 'search' | 'magnet' | 'file';
  isSearchingReleases: boolean;
  isManualFallbackInStep3: boolean;
  manualFallbackMode: 'magnet' | 'file';
  fallbackMagnetLink: string;
  fallbackFile: File | null;
  hasHealthyReleases: boolean;
  showLowHealthAnyway: boolean;
  releaseCandidates: ReleaseCandidate[];
  selectedRelease: ReleaseCandidate | null;
  recommendedRelease: ReleaseCandidate | null;
  activeRelease: ReleaseCandidate | null;
  isExplorerExpanded: boolean;
  candidateSortBy: CandidateSortOption;
  sortOptions: readonly { value: CandidateSortOption; label: string }[];
  hideInfringing: boolean;
  infringingCount: number;
  sortedReleaseCandidates: ReleaseCandidate[];
  isStreamingEnabled: boolean;
  isProwlarrConfigured: boolean;
  isProwlarrReachable: boolean;
  magnetLink: string;
  selectedFile: File | null;
  isSubmitting: boolean;
  submitProgress: { current: number; total: number };
  isCheckingExists: boolean;
  isManualTorrentsEnabled: boolean;
  activeAnimeTitle: string | null;
  hasCjk: (s?: string | null) => boolean;
  formatMediaType: (t: MediaType) => string;
  formatBytes: (bytes: number) => string;
  getCandidateCacheStatus: (c: ReleaseCandidate) => boolean | undefined;
}>();

defineEmits<{
  (e: 'back'): void;
  (e: 'confirm'): void;
  (e: 'setAnimeTitle', title: string): void;
  (e: 'granularityChange', val: 'season' | 'episode'): void;
  (e: 'seasonOrEpisodeChange'): void;
  (e: 'update:seasonNumber', val: number | null): void;
  (e: 'update:episodeNumber', val: number | null): void;
  (e: 'update:waitlistNextSeason', val: boolean): void;
  (e: 'update:watchForNextEpisodes', val: boolean): void;
  (e: 'update:notifyBeforeEachDownload', val: boolean): void;
  (e: 'update:batchSeasonInput', val: number | null): void;
  (e: 'applySeasonToAll'): void;
  (e: 'removeBatchItem', id: string): void;
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
