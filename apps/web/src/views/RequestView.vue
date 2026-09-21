<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <Navbar />

    <main class="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
      <!-- Page Title -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-white">
          New Download Request
        </h1>
        <p class="text-sm text-zinc-400 mt-1">
          Add media by magnet link. We automatically match metadata and rename files for Jellyfin.
        </p>
      </div>

      <!-- Step Indicator -->
      <div class="flex items-center justify-between mb-8 max-w-lg mx-auto">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition"
            :class="currentStep === 1
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
              : currentStep > 1
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400'"
          >
            <svg
              v-if="currentStep > 1"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else>1</span>
          </div>
          <span
            class="text-xs font-medium"
            :class="currentStep >= 1 ? 'text-zinc-200' : 'text-zinc-500'"
          >
            Source
          </span>
        </div>

        <div
          class="h-0.5 flex-1 mx-3 bg-zinc-800"
          :class="{ '!bg-emerald-600': currentStep > 1 }"
        />

        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition"
            :class="currentStep === 2
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
              : currentStep > 2
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400'"
          >
            <svg
              v-if="currentStep > 2"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else>2</span>
          </div>
          <span
            class="text-xs font-medium"
            :class="currentStep >= 2 ? 'text-zinc-200' : 'text-zinc-500'"
          >
            Match
          </span>
        </div>

        <div
          class="h-0.5 flex-1 mx-3 bg-zinc-800"
          :class="{ '!bg-emerald-600': currentStep > 2 }"
        />

        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition"
            :class="currentStep === 3
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
              : 'bg-zinc-800 text-zinc-400'"
          >
            <span>3</span>
          </div>
          <span
            class="text-xs font-medium"
            :class="currentStep === 3 ? 'text-zinc-200' : 'text-zinc-500'"
          >
            Confirm
          </span>
        </div>
      </div>

      <!-- Step 1: Input -->
      <RequestStep1Input
        v-if="currentStep === 1"
        ref="step1Ref"
        v-model:input-mode="inputMode"
        v-model:magnet-link="magnetLink"
        v-model:media-type="mediaType"
        v-model:is-private-episodic="isPrivateEpisodic"
        v-model:download-granularity="downloadGranularity"
        v-model:season-number="seasonNumber"
        v-model:episode-number="episodeNumber"
        v-model:custom-query="customQuery"
        :batch-items="batchItems"
        :valid-batch-items="validBatchItems"
        :invalid-batch-items="invalidBatchItems"
        :total-batch-size="totalBatchSize"
        :is-searching="isSearching"
        :step1-error="step1Error"
        :is-prowlarr-configured="isProwlarrConfigured"
        :is-prowlarr-reachable="isProwlarrReachable"
        :is-manual-torrents-enabled="isManualTorrentsEnabled"
        :media-type-options="mediaTypeOptions"
        :format-bytes="formatBytes"
        @search="handleSearchMetadata"
        @skip-metadata="skipMetadata"
        @granularity-change="onGranularityChange"
        @process-files="processFiles"
        @remove-batch-item="removeBatchItem"
        @clear-all-batch-items="clearAllBatchItems"
      />

      <!-- Step 2: Candidates -->
      <RequestStep2Candidates
        v-else-if="currentStep === 2"
        ref="step2Ref"
        v-model:custom-query="customQuery"
        :media-type="mediaType"
        :is-searching="isSearching"
        :candidates="candidates"
        :selected-candidate="selectedCandidate"
        :step2-error="step2Error"
        @search="handleSearchMetadata"
        @select="selectCandidate"
        @confirm="confirmStep2Selection"
        @back="currentStep = 1; step2Error = null"
        @skip-metadata="skipMetadata"
      />

      <!-- Step 3: Confirmation -->
      <RequestStep3Confirmation
        v-else-if="currentStep === 3 && selectedCandidate"
        v-model:season-number="seasonNumber"
        v-model:episode-number="episodeNumber"
        v-model:waitlist-next-season="waitlistNextSeason"
        v-model:watch-for-next-episodes="watchForNextEpisodes"
        v-model:notify-before-each-download="notifyBeforeEachDownload"
        v-model:batch-season-input="batchSeasonInput"
        v-model:is-manual-fallback-in-step3="isManualFallbackInStep3"
        v-model:manual-fallback-mode="manualFallbackMode"
        v-model:fallback-magnet-link="fallbackMagnetLink"
        v-model:show-low-health-anyway="showLowHealthAnyway"
        v-model:is-explorer-expanded="isExplorerExpanded"
        v-model:candidate-sort-by="candidateSortBy"
        v-model:hide-infringing="hideInfringing"
        :selected-candidate="selectedCandidate"
        :media-type="mediaType"
        :step3-error="step3Error"
        :existing-request="existingRequest"
        :valid-batch-items="validBatchItems"
        :is-searching-releases="isSearchingReleases"
        :is-checking-exists="isCheckingExists"
        :is-submitting="isSubmitting"
        :is-manual-torrents-enabled="isManualTorrentsEnabled"
        :is-streaming-enabled="isStreamingEnabled"
        :download-granularity="downloadGranularity"
        :active-anime-title="activeAnimeTitle"
        :input-mode="inputMode"
        :magnet-link="magnetLink"
        :selected-file="selectedFile"
        :fallback-file="fallbackFile"
        :recommended-release="recommendedRelease"
        :selected-release="selectedRelease"
        :active-release="activeRelease"
        :release-candidates="releaseCandidates"
        :sorted-release-candidates="sortedReleaseCandidates"
        :infringing-count="infringingCount"
        :has-healthy-releases="hasHealthyReleases"
        :is-prowlarr-configured="isProwlarrConfigured"
        :is-prowlarr-reachable="isProwlarrReachable"
        :sort-options="sortOptions"
        :submit-progress="submitProgress"
        :total-batch-size="totalBatchSize"
        :has-cjk="hasCjk"
        :get-candidate-cache-status="getCandidateCacheStatus"
        :format-media-type="formatMediaType"
        :format-bytes="formatBytes"
        @back="currentStep = 2; step3Error = null"
        @confirm="handleConfirmRequest"
        @apply-season-to-all="applySeasonToAll"
        @remove-batch-item="removeBatchItem"
        @navigate-to-waitlist-with-metadata="navigateToWaitlistWithMetadata"
        @set-anime-title="setAnimeTitle"
        @select-release="selectRelease"
        @reset-to-recommended-release="resetToRecommendedRelease"
        @switch-to-manual-upload="switchToManualUpload"
        @handle-fallback-file-change="handleFallbackFileChange"
        @handle-instant-stream-candidate="handleInstantStreamCandidate"
        @season-or-episode-change="onSeasonOrEpisodeChange"
      />
    </main>

    <!-- Instant Stream Modal -->
    <StreamProgressModal
      :show="showStreamModal"
      :stream-id="streamModalId"
      :title="streamModalTitle"
      :status="streamModalStatus"
      :error-message="streamModalError"
      :can-add-to-waitlist="Boolean(selectedCandidate)"
      :is-adding-to-waitlist="isAddingToWaitlistFromModal"
      :has-added-to-waitlist="hasAddedToWaitlistFromModal"
      @close="showStreamModal = false"
      @error="handleStreamPlaybackError"
      @add-to-waitlist="handleConfirmAddToWaitlist"
    />
  </div>
</template>

<script setup lang="ts">
import Navbar from '../components/Navbar.vue';
import StreamProgressModal from '../components/StreamProgressModal.vue';
import RequestStep1Input from '../components/request/RequestStep1Input.vue';
import RequestStep2Candidates from '../components/request/RequestStep2Candidates.vue';
import RequestStep3Confirmation from '../components/request/RequestStep3Confirmation.vue';
import { formatMediaType, formatBytes } from '../lib/formatters';
import {
  useRequestData,
  MetadataCandidate,
  ReleaseCandidate,
  BatchItem,
  CanonicalRequestSummary,
} from '../composables/useRequestData';

export type { MetadataCandidate, ReleaseCandidate, BatchItem, CanonicalRequestSummary };

const {
  isManualTorrentsEnabled,
  isStreamingEnabled,
  currentStep,
  waitlistNextSeason,
  watchForNextEpisodes,
  notifyBeforeEachDownload,
  inputMode,
  magnetLink,
  isSearchingReleases,
  recommendedRelease,
  selectedRelease,
  releaseCandidates,
  isExplorerExpanded,
  candidateSortBy,
  sortOptions,
  showStreamModal,
  streamModalId,
  streamModalTitle,
  streamModalStatus,
  streamModalError,
  selectedFile,
  batchItems,
  batchSeasonInput,
  validBatchItems,
  invalidBatchItems,
  totalBatchSize,
  mediaType,
  customQuery,
  isSearching,
  step1Error,
  step1Ref,
  step2Ref,
  mediaTypeOptions,
  candidates,
  selectedCandidate,
  step2Error,
  existingRequest,
  isCheckingExists,
  seasonNumber,
  downloadGranularity,
  episodeNumber,
  activeAnimeTitle,
  isSubmitting,
  submitProgress,
  step3Error,
  hideInfringing,
  infringingCount,
  activeRelease,
  sortedReleaseCandidates,
  isProwlarrConfigured,
  isProwlarrReachable,
  hasHealthyReleases,
  showLowHealthAnyway,
  isManualFallbackInStep3,
  manualFallbackMode,
  fallbackMagnetLink,
  fallbackFile,
  isPrivateEpisodic,
  isAddingToWaitlistFromModal,
  hasAddedToWaitlistFromModal,
  getCandidateCacheStatus,
  handleInstantStreamCandidate,
  selectRelease,
  resetToRecommendedRelease,
  handleFallbackFileChange,
  switchToManualUpload,
  navigateToWaitlistWithMetadata,
  skipMetadata,
  onGranularityChange,
  onSeasonOrEpisodeChange,
  setAnimeTitle,
  applySeasonToAll,
  removeBatchItem,
  clearAllBatchItems,
  processFiles,
  handleSearchMetadata,
  handleStreamPlaybackError,
  handleConfirmAddToWaitlist,
  selectCandidate,
  confirmStep2Selection,
  handleConfirmRequest,
  hasCjk,
} = useRequestData();
</script>
