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
    <div
      v-if="step3Error"
      class="p-4 bg-red-950/60 border border-red-800 rounded-lg text-sm text-red-200 flex items-start gap-3"
    >
      <svg
        class="w-5 h-5 text-red-400 shrink-0 mt-0.5"
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
        <div class="font-semibold text-red-300">
          Cannot Submit Request
        </div>
        <div class="mt-0.5">
          {{ step3Error }}
        </div>
      </div>
    </div>

    <!-- Selected match preview card -->
    <div class="bg-zinc-950/70 border border-zinc-800 rounded-xl p-5 flex gap-5">
      <div class="w-24 h-36 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-700/50 flex items-center justify-center">
        <img
          v-if="selectedCandidate.posterUrl"
          :src="selectedCandidate.posterUrl"
          :alt="selectedCandidate.title"
          class="w-full h-full object-cover"
        >
        <div
          v-else
          class="text-zinc-600 text-xs text-center p-2"
        >
          No Poster
        </div>
      </div>

      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {{ formatMediaType(mediaType) }}
          </span>
          <span class="text-xs text-zinc-400 uppercase font-mono">
            {{ selectedCandidate.source }} #{{ selectedCandidate.id }}
          </span>
        </div>

        <h3 class="text-xl font-bold text-white mb-1">
          {{ selectedCandidate.title }}
        </h3>

        <div class="text-xs text-zinc-400 mb-3">
          <span v-if="selectedCandidate.year">{{ selectedCandidate.year }}</span>
        </div>

        <p class="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
          {{ selectedCandidate.overview || 'No overview available.' }}
        </p>

        <!-- Anime title variant chips -->
        <div
          v-if="mediaType === 'anime' && (selectedCandidate.romajiTitle || selectedCandidate.englishTitle)"
          class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-800"
        >
          <span class="text-xs text-zinc-400 font-medium">Search Title:</span>
          <button
            v-if="selectedCandidate.romajiTitle || selectedCandidate.title"
            type="button"
            class="px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer"
            :class="activeAnimeTitle === (selectedCandidate.romajiTitle || selectedCandidate.title)
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
              : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'"
            @click="$emit('setAnimeTitle', selectedCandidate.romajiTitle || selectedCandidate.title)"
          >
            {{ hasCjk(selectedCandidate.romajiTitle || selectedCandidate.title) ? 'Original' : 'Romaji' }}: {{ selectedCandidate.romajiTitle || selectedCandidate.title }}
          </button>
          <button
            v-if="selectedCandidate.englishTitle && selectedCandidate.englishTitle !== (selectedCandidate.romajiTitle || selectedCandidate.title)"
            type="button"
            class="px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer"
            :class="activeAnimeTitle === selectedCandidate.englishTitle
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
              : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'"
            @click="$emit('setAnimeTitle', selectedCandidate.englishTitle)"
          >
            English: {{ selectedCandidate.englishTitle }}
          </button>
        </div>
      </div>
    </div>

    <!-- Batch Review Table (Multi-torrent mode) -->
    <BatchRequestModal
      v-if="validBatchItems.length > 1"
      :valid-batch-items="validBatchItems"
      :batch-season-input="batchSeasonInput"
      :total-batch-size="totalBatchSize"
      :format-bytes="formatBytes"
      @update:batch-season-input="$emit('update:batchSeasonInput', $event)"
      @apply-season-to-all="$emit('applySeasonToAll')"
      @remove-batch-item="$emit('removeBatchItem', $event)"
    />

    <!-- Single Item confirmation details (when validBatchItems.length <= 1) -->
    <template v-else>
      <!-- TV Show / Anime Scope & Inputs -->
      <div
        v-if="mediaType === 'tv_show' || mediaType === 'anime'"
        class="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 space-y-3"
      >
        <div class="flex items-center justify-between">
          <label class="block text-sm font-medium text-zinc-300">
            Download Scope
          </label>
          <span class="text-xs text-zinc-500">
            {{ downloadGranularity === 'season' ? 'Season Pack (max 25 GB cap)' : 'Single Episode (max 2 GB cap)' }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3 max-w-sm">
          <button
            type="button"
            class="py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
            :class="downloadGranularity === 'season'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'"
            @click="$emit('granularityChange', 'season')"
          >
            <span>📦</span>
            <span>Season Pack</span>
          </button>
          <button
            type="button"
            class="py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
            :class="downloadGranularity === 'episode'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'"
            @click="$emit('granularityChange', 'episode')"
          >
            <span>🎬</span>
            <span>Single Episode</span>
          </button>
        </div>

        <div class="flex items-center gap-4 pt-1">
          <div>
            <label
              for="step3SeasonNumber"
              class="block text-xs font-medium text-zinc-400 mb-1"
            >
              Season Number
            </label>
            <input
              id="step3SeasonNumber"
              :value="seasonNumber"
              type="number"
              min="1"
              placeholder="1"
              class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              @input="$emit('update:seasonNumber', ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : null)"
              @change="$emit('seasonOrEpisodeChange')"
            >
          </div>

          <div v-if="downloadGranularity === 'episode'">
            <label
              for="step3EpisodeNumber"
              class="block text-xs font-medium text-zinc-400 mb-1"
            >
              Episode Number
            </label>
            <input
              id="step3EpisodeNumber"
              :value="episodeNumber"
              type="number"
              min="1"
              placeholder="1"
              class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              @input="$emit('update:episodeNumber', ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : null)"
              @change="$emit('seasonOrEpisodeChange')"
            >
          </div>
        </div>

        <p class="text-xs text-zinc-500">
          {{ downloadGranularity === 'season'
            ? 'Downloads the entire season pack (default capped at 25 GB).'
            : 'Downloads a single specific episode (default capped at 2 GB).' }}
        </p>

        <!-- Waitlist Next Season Checkbox (Ticket 03) -->
        <div
          v-if="['tv_show', 'anime'].includes(mediaType) && downloadGranularity === 'season'"
          class="pt-3 border-t border-zinc-800/80"
        >
          <label
            for="waitlistNextSeasonCheckbox"
            class="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-zinc-300 select-none hover:text-white transition"
          >
            <input
              id="waitlistNextSeasonCheckbox"
              :checked="waitlistNextSeason"
              type="checkbox"
              data-testid="waitlist-next-season-checkbox"
              class="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
              @change="$emit('update:waitlistNextSeason', ($event.target as HTMLInputElement).checked)"
            />
            <span>Auto-download next season when available</span>
          </label>
          <p class="text-[11px] text-zinc-400 ml-6.5 mt-0.5">
            Automatically monitors trackers and downloads Season {{ (seasonNumber || 1) + 1 }} when released.
          </p>
        </div>

        <!-- Watch for next episodes checkbox (Ticket 04 / Issue #70) -->
        <div
          v-if="['tv_show', 'anime'].includes(mediaType) && downloadGranularity === 'episode'"
          class="pt-3 border-t border-zinc-800/80 space-y-2"
        >
          <label
            for="watchForNextEpisodesCheckbox"
            class="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-zinc-300 select-none hover:text-white transition"
          >
            <input
              id="watchForNextEpisodesCheckbox"
              :checked="watchForNextEpisodes"
              type="checkbox"
              data-testid="watch-for-next-episodes-checkbox"
              class="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
              @change="$emit('update:watchForNextEpisodes', ($event.target as HTMLInputElement).checked)"
            />
            <span>Watch for next episodes</span>
          </label>
          <p class="text-[11px] text-zinc-400 ml-6.5 mt-0.5">
            Automatically monitors trackers and downloads subsequent episodes as they become available.
          </p>

          <!-- Sub-checkbox: Notify before each auto-download -->
          <div
            v-if="watchForNextEpisodes"
            class="ml-6.5 pt-1.5"
          >
            <label
              for="notifyBeforeEachDownloadCheckbox"
              class="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-zinc-300 select-none hover:text-white transition"
            >
              <input
                id="notifyBeforeEachDownloadCheckbox"
                :checked="notifyBeforeEachDownload"
                type="checkbox"
                data-testid="notify-before-each-download-checkbox"
                class="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
                @change="$emit('update:notifyBeforeEachDownload', ($event.target as HTMLInputElement).checked)"
              />
              <span>Notify me before each auto-download</span>
            </label>
            <p class="text-[11px] text-zinc-400 ml-6.5 mt-0.5">
              Sends a Discord notification with a grace window before downloading each episode.
            </p>
          </div>
        </div>
      </div>

      <!-- Duplicate Request Confirmation Banner (Ticket 04) -->
      <div
        v-if="existingRequest"
        data-testid="duplicate-already-exists-banner"
        class="p-5 sm:p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-4"
      >
        <div class="flex items-start gap-4">
          <div class="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
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
              <span v-if="existingRequest.seasonNumber != null" class="text-zinc-400">
                Season {{ existingRequest.seasonNumber }}
                <span v-if="existingRequest.episodeNumber != null"> • Episode {{ existingRequest.episodeNumber }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <template v-else>
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
          <div
            v-if="isManualFallbackInStep3"
            data-testid="step3-manual-fallback"
            class="p-5 border border-indigo-500/40 rounded-xl bg-zinc-950/80 space-y-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-sm font-semibold text-white flex items-center gap-2">
                  <span>⚡ Manual Upload Fallback</span>
                  <span class="text-[11px] font-normal text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                    Metadata Preserved
                  </span>
                </h4>
                <p class="text-xs text-zinc-400 mt-0.5">
                  Attach a magnet link or .torrent file for <strong>{{ selectedCandidate?.title }}</strong>
                </p>
              </div>
              <button
                type="button"
                data-testid="cancel-manual-fallback"
                class="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                @click="$emit('update:isManualFallbackInStep3', false)"
              >
                Back to Releases
              </button>
            </div>

            <!-- Fallback mode tabs: magnet or file -->
            <div class="flex gap-2 border-b border-zinc-800 pb-2">
              <button
                type="button"
                data-testid="fallback-tab-magnet"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                :class="manualFallbackMode === 'magnet' ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
                @click="$emit('update:manualFallbackMode', 'magnet')"
              >
                🧲 Magnet Link
              </button>
              <button
                type="button"
                data-testid="fallback-tab-file"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                :class="manualFallbackMode === 'file' ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
                @click="$emit('update:manualFallbackMode', 'file')"
              >
                📁 Torrent File
              </button>
            </div>

            <!-- Magnet Input -->
            <div v-if="manualFallbackMode === 'magnet'" class="space-y-2">
              <label class="block text-xs font-medium text-zinc-300">Paste Magnet Link</label>
              <input
                :value="fallbackMagnetLink"
                data-testid="step3-fallback-magnet-input"
                type="text"
                placeholder="magnet:?xt=urn:btih:..."
                class="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                @input="$emit('update:fallbackMagnetLink', ($event.target as HTMLInputElement).value)"
              />
            </div>

            <!-- File Input -->
            <div v-else class="space-y-2">
              <label class="block text-xs font-medium text-zinc-300">Upload .torrent File</label>
              <input
                type="file"
                data-testid="step3-fallback-file-input"
                accept=".torrent"
                class="block w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                @change="$emit('handleFallbackFileChange', $event)"
              />
              <p v-if="fallbackFile" class="text-xs text-emerald-400 font-mono mt-1">
                ✓ Selected: {{ fallbackFile.name }} ({{ formatBytes(fallbackFile.size) }})
              </p>
            </div>
          </div>

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
          <div
            v-if="!isManualFallbackInStep3 && releaseCandidates.length > 0 && (hasHealthyReleases || showLowHealthAnyway || selectedRelease)"
            class="border border-zinc-800 bg-zinc-950/50 rounded-xl overflow-hidden"
          >
            <!-- Expand / Collapse Toggle Header -->
            <button
              type="button"
              data-testid="toggle-explorer"
              class="w-full px-4 py-3 bg-zinc-900/40 hover:bg-zinc-900/80 transition flex items-center justify-between cursor-pointer text-left"
              @click="$emit('update:isExplorerExpanded', !isExplorerExpanded)"
            >
              <div class="flex items-center gap-2.5">
                <span class="text-sm">🔎</span>
                <div>
                  <span class="text-xs font-semibold text-white">
                    Explore All Releases
                  </span>
                  <span class="ml-2 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[11px] font-mono">
                    {{ releaseCandidates.length }} found
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2 text-xs text-zinc-400">
                <span>{{ isExplorerExpanded ? 'Hide alternatives' : 'Browse & choose alternative' }}</span>
                <svg
                  class="w-4 h-4 transition-transform duration-200"
                  :class="{ 'rotate-180': isExplorerExpanded }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            <!-- Expanded Explorer Content -->
            <div v-if="isExplorerExpanded" data-testid="explorer-drawer" class="p-4 border-t border-zinc-800 space-y-4">
              <!-- Toolbar: Sorting & Count -->
              <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80 text-xs">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-zinc-400 font-medium">Sort By:</span>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <button
                      v-for="opt in sortOptions"
                      :key="opt.value"
                      type="button"
                      :data-testid="'sort-' + opt.value"
                      class="px-2.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer"
                      :class="candidateSortBy === opt.value
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'"
                      @click="$emit('update:candidateSortBy', opt.value)"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-1.5 text-zinc-400 cursor-pointer text-[11px] select-none">
                    <input
                      :checked="hideInfringing"
                      type="checkbox"
                      class="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                      data-testid="toggle-hide-infringing"
                      @change="$emit('update:hideInfringing', ($event.target as HTMLInputElement).checked)"
                    />
                    <span>Hide DMCA Blocked</span>
                  </label>
                  <span v-if="infringingCount > 0 && hideInfringing" class="text-amber-400/80 text-[11px]">
                    ({{ infringingCount }} hidden)
                  </span>
                  <span class="text-zinc-500 text-[11px]">
                    Click any release to select it
                  </span>
                </div>
              </div>

              <!-- Scrollable Candidate List -->
              <div class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                <div
                  v-for="candidate in sortedReleaseCandidates"
                  :key="candidate.guid"
                  :data-testid="'candidate-item-' + candidate.guid"
                  class="p-3.5 rounded-lg border transition cursor-pointer flex flex-col gap-2 group"
                  :class="selectedRelease?.guid === candidate.guid
                    ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50'
                    : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'"
                  @click="$emit('selectRelease', candidate)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          v-if="candidate.guid === recommendedRelease?.guid"
                          class="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-bold uppercase tracking-wider"
                        >
                          ★ Recommended
                        </span>
                        <span
                          v-if="selectedRelease?.guid === candidate.guid"
                          class="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 text-[10px] font-bold uppercase tracking-wider"
                        >
                          ✓ Selected
                        </span>
                        <span class="text-[11px] font-mono text-zinc-400">
                          {{ candidate.indexer }}
                        </span>
                        <span
                          v-if="candidate.isPreferred"
                          class="px-2 py-0.5 rounded bg-teal-950/80 border border-teal-700/80 text-teal-300 text-[10px] font-bold uppercase tracking-wider"
                          data-testid="badge-preferred-candidate"
                        >
                          ⭐ Preferred
                        </span>
                        <span
                          v-if="candidate.isPrivateTracker"
                          class="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[10px] font-bold uppercase tracking-wider"
                          title="Private tracker — cloud streaming barred"
                          data-testid="badge-private-tracker"
                        >
                          🔒 Private
                        </span>
                        <span
                          v-else-if="candidate.isInfringing"
                          class="px-2 py-0.5 rounded bg-red-950/80 border border-red-700/80 text-red-300 text-[10px] font-bold tracking-wider flex items-center gap-1"
                          title="Real-Debrid DMCA takedown — streaming blocked"
                          data-testid="badge-dmca-blocked-label"
                        >
                          🚫 DMCA Blocked
                        </span>
                        <span
                          v-else-if="isStreamingEnabled && getCandidateCacheStatus(candidate) === true"
                          class="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-bold tracking-wider flex items-center gap-1"
                          title="Cached in Real-Debrid — ready for instant stream"
                          data-testid="badge-instant-cached"
                        >
                          ⚡ Instant Stream
                        </span>
                      </div>
                      <h5
                        class="text-xs font-mono text-zinc-200 group-hover:text-white transition break-all leading-snug"
                        :title="candidate.title"
                      >
                        {{ candidate.title }}
                      </h5>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      <span
                        v-if="candidate.isInfringing"
                        class="px-2.5 py-1 rounded text-xs font-medium bg-red-950/60 border border-red-800/60 text-red-400 flex items-center gap-1 cursor-not-allowed"
                        title="This release has been taken down on Real-Debrid (DMCA infringing file)"
                        data-testid="badge-dmca-blocked"
                      >
                        <span>🚫</span>
                        <span>DMCA Blocked</span>
                      </span>
                      <button
                        v-else-if="isStreamingEnabled && !candidate.isPrivateTracker"
                        type="button"
                        class="px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer flex items-center gap-1"
                        :class="getCandidateCacheStatus(candidate) === true
                          ? 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-zinc-950 shadow-sm'
                          : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'"
                        title="Stream instantly via cloud debrid"
                        data-testid="button-instant-stream"
                        @click.stop="$emit('handleInstantStreamCandidate', candidate)"
                      >
                        <span>⚡</span>
                        <span>{{ getCandidateCacheStatus(candidate) === true ? 'Instant Stream' : 'Stream' }}</span>
                      </button>
                      <button
                        type="button"
                        class="px-3 py-1 rounded text-xs font-medium border transition cursor-pointer"
                        :class="selectedRelease?.guid === candidate.guid
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 group-hover:bg-zinc-700 group-hover:text-white'"
                      >
                        {{ selectedRelease?.guid === candidate.guid ? 'Selected' : 'Choose' }}
                      </button>
                    </div>
                  </div>

                  <!-- Metadata Badges -->
                  <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span class="px-2 py-0.5 rounded bg-zinc-800 text-emerald-300 border border-zinc-700 font-medium">
                      {{ candidate.resolution }}
                    </span>
                    <span v-if="candidate.codec !== 'unknown'" class="px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700 font-medium">
                      {{ candidate.codec }}
                    </span>
                    <span v-if="candidate.source !== 'unknown'" class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                      {{ candidate.source }}
                    </span>
                    <span class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                      {{ candidate.formattedSize }}
                    </span>
                    <span
                      class="px-2 py-0.5 rounded border font-medium flex items-center gap-1"
                      :class="candidate.isLowHealth
                        ? 'bg-amber-950/50 border-amber-800/60 text-amber-300'
                        : 'bg-zinc-800 border-zinc-700 text-emerald-400'"
                    >
                      <span>{{ candidate.seeders }} seeders</span>
                      <span class="text-zinc-500">•</span>
                      <span>{{ candidate.leechers }} leechers</span>
                    </span>
                    <span class="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono text-[10px] ml-auto">
                      Score: {{ candidate.score }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
      </template>
    </template>

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
import BatchRequestModal from './BatchRequestModal.vue';
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
