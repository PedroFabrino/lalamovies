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
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
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
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
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

      <!-- ================= STEP 1: Magnet & Type ================= -->
      <div
        v-if="currentStep === 1"
        class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl"
      >
        <!-- Error Alert -->
        <div
          v-if="step1Error"
          class="mb-6 p-4 bg-red-950/50 border border-red-800/80 rounded-lg text-sm text-red-200 flex items-start gap-3"
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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{{ step1Error }}</span>
        </div>

        <!-- Prowlarr Offline / Not Configured Warning Banner -->
        <div
          v-if="!isProwlarrConfigured || !isProwlarrReachable"
          class="mb-6 p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs flex items-start gap-3"
        >
          <span class="text-base shrink-0">⚠️</span>
          <div>
            <div class="font-semibold text-amber-300">
              {{ !isProwlarrConfigured ? 'Automatic Torrent Search Not Configured' : 'Automatic Torrent Search Service Offline' }}
            </div>
            <div class="mt-0.5 text-amber-300/80 leading-relaxed">
              {{ !isProwlarrConfigured
                ? 'Prowlarr API key is not configured. Defaulted to manual Magnet Link / Torrent File upload.'
                : 'Prowlarr indexer proxy is currently unreachable. Defaulted to manual Magnet Link / Torrent File upload.' }}
            </div>
          </div>
        </div>

        <!-- Input Mode Switcher Tabs -->
        <div class="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-lg max-w-sm mb-6">
          <button
            type="button"
            @click="inputMode = 'search'"
            class="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            :class="inputMode === 'search' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          >
            <span>🔍</span>
            <span>Search</span>
          </button>
          <button
            type="button"
            @click="inputMode = 'magnet'"
            class="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            :class="inputMode === 'magnet' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          >
            <span>🧲</span>
            <span>Magnet Link</span>
          </button>
          <button
            type="button"
            @click="inputMode = 'file'"
            class="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            :class="inputMode === 'file' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          >
            <span>📄</span>
            <span>Torrent File</span>
          </button>
        </div>

        <form
          class="space-y-6"
          @submit.prevent="handleSearchMetadata"
        >
          <!-- Search Mode banner -->
          <div v-if="inputMode === 'search'" class="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-400">
            Type a title below. We'll match metadata and automatically find the best healthy 1080p release via Prowlarr.
          </div>

          <!-- Magnet link input -->
          <div v-else-if="inputMode === 'magnet'">
            <label
              for="magnetLink"
              class="block text-sm font-medium text-zinc-300 mb-2"
            >
              Magnet Link
            </label>
            <textarea
              id="magnetLink"
              v-model="magnetLink"
              rows="4"
              required
              :disabled="isSearching"
              placeholder="magnet:?xt=urn:btih:..."
              class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            />
            <p class="text-xs text-zinc-500 mt-1.5">
              Paste the full magnet URI from your torrent indexer.
            </p>
          </div>

          <!-- Torrent file dropzone / batch list -->
          <div v-else-if="inputMode === 'file'" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-zinc-300">
                Upload .torrent Files
              </label>
              <span v-if="batchItems.length > 0" class="text-xs text-zinc-400">
                {{ validBatchItems.length }} valid torrent{{ validBatchItems.length === 1 ? '' : 's' }}
                <span v-if="validBatchItems.length > 0">({{ formatBytes(totalBatchSize) }})</span>
              </span>
            </div>

            <!-- Hidden input for file selection with multiple -->
            <input
              ref="fileInputRef"
              type="file"
              accept=".torrent"
              multiple
              class="hidden"
              @change="handleFileInputChange"
            />

            <!-- Drag & Drop Zone if no items -->
            <div
              v-if="batchItems.length === 0"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
              @click="fileInputRef?.click()"
              class="relative border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer"
              :class="isDragging
                ? 'border-indigo-500 bg-indigo-950/20 ring-4 ring-indigo-500/10'
                : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/30'"
            >
              <div class="flex flex-col items-center gap-2">
                <div class="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-xl">
                  📄
                </div>
                <div class="text-sm font-medium text-zinc-200">
                  Click to browse or drag & drop <span class="text-indigo-400">.torrent</span> files
                </div>
                <p class="text-xs text-zinc-500">
                  Supports single torrents or multi-torrent episode batches
                </p>
              </div>
            </div>

            <!-- Batch Files Queue Container when batchItems.length > 0 -->
            <div
              v-else
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
              class="rounded-xl border p-4 transition"
              :class="isDragging
                ? 'border-indigo-500 bg-indigo-950/20 ring-4 ring-indigo-500/10'
                : 'border-zinc-800 bg-zinc-950/60'"
            >
              <!-- Action bar above list -->
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
                    <span>✓</span>
                    <span>{{ validBatchItems.length }} Valid</span>
                  </span>
                  <span
                    v-if="invalidBatchItems.length > 0"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-semibold"
                  >
                    <span>⚠️</span>
                    <span>{{ invalidBatchItems.length }} Invalid</span>
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="fileInputRef?.click()"
                    class="px-2.5 py-1 text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800/50 rounded-md transition cursor-pointer flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Add More</span>
                  </button>
                  <button
                    type="button"
                    @click="clearAllBatchItems"
                    class="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-red-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <!-- Scrollable file queue list -->
              <div class="max-h-60 overflow-y-auto space-y-2 pr-1">
                <div
                  v-for="item in batchItems"
                  :key="item.id"
                  class="flex items-center justify-between p-2.5 rounded-lg border text-xs transition"
                  :class="item.error
                    ? 'bg-red-950/20 border-red-800/40 text-red-200'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-200'"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                    <span
                      class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs font-bold"
                      :class="item.error ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/40 text-emerald-400'"
                    >
                      {{ item.error ? '!' : '✓' }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="font-medium truncate" :title="item.fileName">
                        {{ item.fileName }}
                      </div>
                      <div class="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <span v-if="!item.error">{{ formatBytes(item.fileSizeBytes) }}</span>
                        <span
                          v-if="item.seasonNumber !== undefined || item.episodeNumber !== undefined"
                          class="px-1.5 py-0.2 rounded bg-zinc-800 text-indigo-300 font-mono"
                        >
                          <span v-if="item.seasonNumber !== undefined">S{{ String(item.seasonNumber).padStart(2, '0') }}</span>
                          <span v-if="item.episodeNumber !== undefined">E{{ String(item.episodeNumber).padStart(2, '0') }}</span>
                        </span>
                        <span v-if="item.error" class="text-red-400 font-medium">
                          {{ item.error }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Remove badge button -->
                  <button
                    type="button"
                    @click.stop="removeBatchItem(item.id)"
                    class="shrink-0 w-6 h-6 rounded flex items-center justify-center transition cursor-pointer"
                    :class="item.error
                      ? 'text-red-400 hover:bg-red-900/60 hover:text-red-200'
                      : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Quick drag hint inside list container -->
              <p class="text-[11px] text-zinc-500 text-center mt-2.5 pt-2 border-t border-zinc-800/60">
                Drag and drop more files here to add to this batch
              </p>
            </div>
          </div>

          <!-- Media Type radio selection -->
          <div>
            <label class="block text-sm font-medium text-zinc-300 mb-2">
              Media Type
            </label>
            <div class="grid grid-cols-3 gap-3">
              <label
                v-for="type in mediaTypeOptions"
                :key="type.value"
                class="flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition text-center"
                :class="mediaType === type.value
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'"
              >
                <input
                  v-model="mediaType"
                  type="radio"
                  name="mediaType"
                  :value="type.value"
                  class="sr-only"
                >
                <span class="text-lg mb-1">{{ type.icon }}</span>
                <span class="text-xs sm:text-sm font-medium">{{ type.label }}</span>
              </label>
            </div>
          </div>

          <!-- Scope & Season / Episode Inputs (Step 1 - TV Show & Anime) -->
          <div
            v-if="mediaType === 'tv_show' || mediaType === 'anime'"
            class="space-y-3 p-4 bg-zinc-950/40 border border-zinc-800/80 rounded-xl"
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
                @click="onGranularityChange('season')"
                class="py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                :class="downloadGranularity === 'season'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'"
              >
                <span>📦</span>
                <span>Season Pack</span>
              </button>
              <button
                type="button"
                @click="onGranularityChange('episode')"
                class="py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                :class="downloadGranularity === 'episode'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'"
              >
                <span>🎬</span>
                <span>Single Episode</span>
              </button>
            </div>

            <div class="flex items-center gap-4 pt-1">
              <div>
                <label
                  for="step1SeasonNumber"
                  class="block text-xs font-medium text-zinc-400 mb-1"
                >
                  Season Number
                </label>
                <input
                  id="step1SeasonNumber"
                  v-model.number="seasonNumber"
                  type="number"
                  min="1"
                  placeholder="1"
                  :disabled="isSearching"
                  class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
                >
              </div>

              <div v-if="downloadGranularity === 'episode'">
                <label
                  for="step1EpisodeNumber"
                  class="block text-xs font-medium text-zinc-400 mb-1"
                >
                  Episode Number
                </label>
                <input
                  id="step1EpisodeNumber"
                  v-model.number="episodeNumber"
                  type="number"
                  min="1"
                  placeholder="1"
                  :disabled="isSearching"
                  class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
                >
              </div>
            </div>

            <p class="text-xs text-zinc-500">
              {{ downloadGranularity === 'season'
                ? 'Downloads the entire season pack (default capped at 25 GB).'
                : 'Downloads a single specific episode (default capped at 2 GB).' }}
            </p>
          </div>

          <!-- Media Title / Search Query (Required) -->
          <div>
            <label
              for="customQuery"
              class="block text-sm font-medium text-zinc-300 mb-2"
            >
              Media Title / Search Query <span class="text-xs text-red-400">*</span>
            </label>
            <input
              id="customQuery"
              ref="customQueryInputRef"
              v-model="customQuery"
              type="text"
              required
              :disabled="isSearching"
              placeholder="e.g. Inception, Breaking Bad, Jujutsu Kaisen"
              class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            >
            <p class="text-xs text-zinc-500 mt-1.5">
              Clean title used to search TMDB or AniList for metadata matching.
            </p>
          </div>

          <button
            type="submit"
            :disabled="isSearching || !customQuery.trim() || (inputMode === 'magnet' && !magnetLink.trim()) || (inputMode === 'file' && validBatchItems.length === 0)"
            class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg
              v-if="isSearching"
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
                isSearching
                  ? 'Searching Metadata...'
                  : validBatchItems.length > 1
                    ? `Find Matches & Continue (${validBatchItems.length} torrents)`
                    : 'Find Matches & Continue'
              }}
            </span>
          </button>
        </form>
      </div>

      <!-- ================= STEP 2: Match Cards ================= -->
      <div
        v-else-if="currentStep === 2"
        class="space-y-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-white">
              Select Metadata Match
            </h2>
            <p class="text-xs text-zinc-400 mt-0.5">
              Choose the correct match for your media to ensure proper naming in Jellyfin.
            </p>
          </div>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            @click="currentStep = 1; step2Error = null"
          >
            Back to Step 1
          </button>
        </div>

        <!-- In-Place Search Bar -->
        <form
          class="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3"
          @submit.prevent="handleSearchMetadata"
        >
          <div class="relative flex-1">
            <input
              ref="step2QueryInputRef"
              v-model="customQuery"
              type="text"
              required
              :disabled="isSearching"
              placeholder="Refine title or search query..."
              class="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            :disabled="isSearching || !customQuery.trim()"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <svg
              v-if="isSearching"
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
            <span>{{ isSearching ? 'Searching...' : 'Search' }}</span>
          </button>
        </form>

        <!-- Step 2 Error Alert -->
        <div
          v-if="step2Error"
          class="p-4 bg-red-950/50 border border-red-800/80 rounded-lg text-sm text-red-200 flex items-start gap-3"
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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{{ step2Error }}</span>
        </div>

        <div
          v-if="candidates.length === 0"
          class="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center"
        >
          <p class="text-zinc-400 text-sm mb-2">
            No metadata matches found for "{{ customQuery }}".
          </p>
          <p class="text-xs text-zinc-500 mb-4">
            Try adjusting your search query in the bar above or check the spelling.
          </p>
          <button
            type="button"
            class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition cursor-pointer"
            @click="currentStep = 1; step2Error = null"
          >
            Back to Step 1
          </button>
        </div>

        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div
            v-for="candidate in candidates"
            :key="candidate.id"
            class="bg-zinc-900/70 border rounded-xl p-4 flex gap-4 transition cursor-pointer group"
            :class="selectedCandidate?.id === candidate.id
              ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20'
              : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'"
            @click="selectCandidate(candidate)"
          >
            <!-- Poster image -->
            <div class="w-20 h-28 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-700/50 flex items-center justify-center">
              <img
                v-if="candidate.posterUrl"
                :src="candidate.posterUrl"
                :alt="candidate.title"
                class="w-full h-full object-cover"
                loading="lazy"
              >
              <div
                v-else
                class="text-zinc-600 text-xs text-center p-2"
              >
                No Poster
              </div>
            </div>

            <!-- Match info -->
            <div class="flex-1 flex flex-col justify-between overflow-hidden">
              <div>
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-semibold text-white text-sm group-hover:text-indigo-300 transition line-clamp-1">
                    {{ candidate.title }}
                  </h3>
                  <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {{ candidate.source }}
                  </span>
                </div>
                <div class="text-xs text-zinc-400 mt-0.5">
                  <span v-if="candidate.year">{{ candidate.year }}</span>
                  <span v-else>Year unknown</span>
                </div>
                <p class="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                  {{ candidate.overview || 'No overview available.' }}
                </p>
              </div>

              <div class="mt-3 flex items-center justify-end">
                <span
                  class="text-xs font-medium transition flex items-center gap-1"
                  :class="selectedCandidate?.id === candidate.id ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'"
                >
                  <svg
                    v-if="selectedCandidate?.id === candidate.id"
                    class="w-4 h-4 text-indigo-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span>{{ selectedCandidate?.id === candidate.id ? 'Selected' : 'Select' }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            @click="currentStep = 1"
          >
            Back
          </button>
          <button
            type="button"
            :disabled="!selectedCandidate"
            class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            @click="currentStep = 3"
          >
            Continue to Confirmation
          </button>
        </div>
      </div>

      <!-- ================= STEP 3: Confirm & Submit ================= -->
      <div
        v-else-if="currentStep === 3 && selectedCandidate"
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
                @click="setAnimeTitle(selectedCandidate.romajiTitle || selectedCandidate.title)"
                class="px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer"
                :class="activeAnimeTitle === (selectedCandidate.romajiTitle || selectedCandidate.title)
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'"
              >
                Romaji: {{ selectedCandidate.romajiTitle || selectedCandidate.title }}
              </button>
              <button
                v-if="selectedCandidate.englishTitle"
                type="button"
                @click="setAnimeTitle(selectedCandidate.englishTitle)"
                class="px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer"
                :class="activeAnimeTitle === selectedCandidate.englishTitle
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'"
              >
                English: {{ selectedCandidate.englishTitle }}
              </button>
            </div>
          </div>
        </div>

        <!-- Batch Review Table (Multi-torrent mode) -->
        <div v-if="validBatchItems.length > 1" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white">
              Episode Review & Mapping
            </h3>
            <span class="text-xs text-zinc-400">
              Edit Season and Episode numbers before confirmation
            </span>
          </div>

          <!-- Quick Season Applicator Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
            <div class="flex items-center gap-2">
              <span class="text-zinc-400 font-medium">Quick Apply Season:</span>
              <input
                v-model.number="batchSeasonInput"
                type="number"
                min="1"
                placeholder="1"
                class="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                @click="applySeasonToAll"
                class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition cursor-pointer"
              >
                Apply to All
              </button>
            </div>
            <div class="text-zinc-400 font-medium">
              <span>{{ validBatchItems.length }} Episodes</span> •
              <span>{{ formatBytes(totalBatchSize) }} Total</span>
            </div>
          </div>

          <!-- Interactive Review Table -->
          <div class="overflow-x-auto rounded-lg border border-zinc-800 max-h-72 overflow-y-auto">
            <table class="w-full text-left text-xs text-zinc-300">
              <thead class="bg-zinc-950 sticky top-0 z-10 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th class="px-3 py-2.5 w-10 text-center">#</th>
                  <th class="px-3 py-2.5 w-24">Season</th>
                  <th class="px-3 py-2.5 w-24">Episode</th>
                  <th class="px-3 py-2.5">Torrent File</th>
                  <th class="px-3 py-2.5 w-24 text-right">Size</th>
                  <th class="px-3 py-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800/60 bg-zinc-900/30 font-sans">
                <tr
                  v-for="(item, idx) in validBatchItems"
                  :key="item.id"
                  class="hover:bg-zinc-800/40 transition"
                >
                  <td class="px-3 py-2 text-center text-zinc-500 font-mono text-xs">
                    {{ idx + 1 }}
                  </td>
                  <td class="px-3 py-2">
                    <input
                      v-model.number="item.seasonNumber"
                      type="number"
                      min="1"
                      placeholder="1"
                      class="w-18 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td class="px-3 py-2">
                    <input
                      v-model.number="item.episodeNumber"
                      type="number"
                      min="1"
                      placeholder="—"
                      class="w-18 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td class="px-3 py-2 max-w-xs sm:max-w-md truncate font-mono text-zinc-200 text-xs" :title="item.fileName">
                    {{ item.fileName }}
                  </td>
                  <td class="px-3 py-2 text-right text-zinc-400 font-mono text-xs whitespace-nowrap">
                    {{ formatBytes(item.fileSizeBytes) }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button
                      type="button"
                      @click="removeBatchItem(item.id)"
                      class="text-zinc-500 hover:text-red-400 p-1 text-xs transition cursor-pointer"
                      title="Remove from batch"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

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
                @click="onGranularityChange('season')"
                class="py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                :class="downloadGranularity === 'season'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'"
              >
                <span>📦</span>
                <span>Season Pack</span>
              </button>
              <button
                type="button"
                @click="onGranularityChange('episode')"
                class="py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                :class="downloadGranularity === 'episode'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'"
              >
                <span>🎬</span>
                <span>Single Episode</span>
              </button>
            </div>

            <div class="flex items-center gap-4 pt-1">
              <div>
                <label
                  for="seasonNumber"
                  class="block text-xs font-medium text-zinc-400 mb-1"
                >
                  Season Number
                </label>
                <input
                  id="seasonNumber"
                  v-model.number="seasonNumber"
                  type="number"
                  min="1"
                  placeholder="1"
                  :disabled="isSubmitting"
                  @change="onSeasonOrEpisodeChange"
                  class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
                />
              </div>

              <div v-if="downloadGranularity === 'episode'">
                <label
                  for="episodeNumber"
                  class="block text-xs font-medium text-zinc-400 mb-1"
                >
                  Episode Number
                </label>
                <input
                  id="episodeNumber"
                  v-model.number="episodeNumber"
                  type="number"
                  min="1"
                  placeholder="1"
                  :disabled="isSubmitting"
                  @change="onSeasonOrEpisodeChange"
                  class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
                />
              </div>
            </div>

            <p class="text-xs text-zinc-500">
              {{ downloadGranularity === 'season'
                ? 'Targeting entire season for library naming (e.g. Season 01).'
                : 'Targeting specific episode for library naming (e.g. S01E01).' }}
            </p>
          </div>

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
                  @click="isManualFallbackInStep3 = false"
                  class="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Back to Releases
                </button>
              </div>

              <!-- Fallback mode tabs: magnet or file -->
              <div class="flex gap-2 border-b border-zinc-800 pb-2">
                <button
                  type="button"
                  data-testid="fallback-tab-magnet"
                  @click="manualFallbackMode = 'magnet'"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                  :class="manualFallbackMode === 'magnet' ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
                >
                  🧲 Magnet Link
                </button>
                <button
                  type="button"
                  data-testid="fallback-tab-file"
                  @click="manualFallbackMode = 'file'"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                  :class="manualFallbackMode === 'file' ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
                >
                  📁 Torrent File
                </button>
              </div>

              <!-- Magnet Input -->
              <div v-if="manualFallbackMode === 'magnet'" class="space-y-2">
                <label class="block text-xs font-medium text-zinc-300">Paste Magnet Link</label>
                <input
                  v-model="fallbackMagnetLink"
                  data-testid="step3-fallback-magnet-input"
                  type="text"
                  placeholder="magnet:?xt=urn:btih:..."
                  class="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <!-- File Input -->
              <div v-else class="space-y-2">
                <label class="block text-xs font-medium text-zinc-300">Upload .torrent File</label>
                <input
                  type="file"
                  data-testid="step3-fallback-file-input"
                  accept=".torrent"
                  @change="handleFallbackFileChange"
                  class="block w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
                <p v-if="fallbackFile" class="text-xs text-emerald-400 font-mono mt-1">
                  ✓ Selected: {{ fallbackFile.name }} ({{ formatBytes(fallbackFile.size) }})
                </p>
              </div>
            </div>

            <!-- Low-Health Warning Alert (When releases exist, but none reach threshold and no release selected yet) -->
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
                  @click="switchToManualUpload"
                  class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>⚡ Switch to Manual Upload</span>
                </button>
                <button
                  type="button"
                  data-testid="toggle-low-health-anyway"
                  @click="showLowHealthAnyway = !showLowHealthAnyway"
                  class="px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-amber-700/60 text-amber-200 rounded-lg text-xs font-medium transition cursor-pointer"
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
                    v-if="activeRelease.guid === recommendedRelease?.guid"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs font-semibold"
                  >
                    <span>★</span>
                    <span>Recommended Release</span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 text-xs font-semibold"
                  >
                    <span>✓</span>
                    <span>Custom Selected Release</span>
                  </span>
                </div>

                <div class="flex items-center gap-3">
                  <button
                    v-if="recommendedRelease && activeRelease.guid !== recommendedRelease.guid"
                    type="button"
                    @click="resetToRecommendedRelease"
                    class="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    Reset to recommended
                  </button>
                  <span class="text-xs font-mono text-zinc-400">
                    via {{ activeRelease.indexer }}
                  </span>
                </div>
              </div>

              <div>
                <h4 class="font-mono text-sm text-white font-medium break-all">
                  {{ activeRelease.title }}
                </h4>
              </div>

              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 font-medium">
                  {{ activeRelease.resolution }}
                </span>
                <span v-if="activeRelease.codec !== 'unknown'" class="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 font-medium">
                  {{ activeRelease.codec }}
                </span>
                <span v-if="activeRelease.source !== 'unknown'" class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium uppercase text-[11px]">
                  {{ activeRelease.source }}
                </span>
                <span class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  {{ activeRelease.formattedSize }}
                </span>
                <span
                  class="px-2 py-0.5 rounded border font-medium flex items-center gap-1"
                  :class="activeRelease.isLowHealth
                    ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                    : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'"
                >
                  <span>{{ activeRelease.isLowHealth ? '⚠️' : '✓' }}</span>
                  <span>{{ activeRelease.seeders }} seeders</span>
                </span>
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
                @click="isExplorerExpanded = !isExplorerExpanded"
                class="w-full px-4 py-3 bg-zinc-900/40 hover:bg-zinc-900/80 transition flex items-center justify-between cursor-pointer text-left"
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
                        @click="candidateSortBy = opt.value"
                        class="px-2.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer"
                        :class="candidateSortBy === opt.value
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'"
                      >
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>

                  <span class="text-zinc-500 text-[11px]">
                    Click any release to select it
                  </span>
                </div>

                <!-- Scrollable Candidate List -->
                <div class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  <div
                    v-for="candidate in sortedReleaseCandidates"
                    :key="candidate.guid"
                    :data-testid="'candidate-item-' + candidate.guid"
                    @click="selectRelease(candidate)"
                    class="p-3.5 rounded-lg border transition cursor-pointer flex flex-col gap-2 group"
                    :class="selectedRelease?.guid === candidate.guid
                      ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50'
                      : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'"
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
                        </div>
                        <h5
                          class="text-xs font-mono text-zinc-200 group-hover:text-white transition break-all leading-snug"
                          :title="candidate.title"
                        >
                          {{ candidate.title }}
                        </h5>
                      </div>

                      <button
                        type="button"
                        class="shrink-0 px-3 py-1 rounded text-xs font-medium border transition cursor-pointer"
                        :class="selectedRelease?.guid === candidate.guid
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 group-hover:bg-zinc-700 group-hover:text-white'"
                      >
                        {{ selectedRelease?.guid === candidate.guid ? 'Selected' : 'Choose' }}
                      </button>
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
                @click="switchToManualUpload"
                class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
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
              <button
                type="button"
                data-testid="switch-to-manual-upload-noreleases"
                @click="switchToManualUpload"
                class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>⚡ Switch to Manual Upload</span>
              </button>
            </div>
          </div>

          <!-- Source summary for magnet/file modes -->
          <div v-else class="text-xs text-zinc-500 break-all bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
            <span class="text-zinc-400 font-semibold">{{ inputMode === 'file' ? 'Torrent File:' : 'Magnet:' }}</span>
            {{ inputMode === 'file' ? (validBatchItems[0]?.fileName || selectedFile?.name) : (magnetLink.length > 80 ? magnetLink.slice(0, 80) + '...' : magnetLink) }}
          </div>
        </template>

        <div class="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            type="button"
            :disabled="isSubmitting"
            class="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer disabled:opacity-50"
            @click="currentStep = 2"
          >
            Back
          </button>
          <button
            type="button"
            :disabled="isSubmitting || (inputMode === 'file' && validBatchItems.length === 0) || (inputMode === 'magnet' && !magnetLink.trim()) || (inputMode === 'search' && (isSearchingReleases || (isManualFallbackInStep3 ? (manualFallbackMode === 'magnet' ? !fallbackMagnetLink.trim() : !fallbackFile) : (!selectedRelease && !recommendedRelease))))"
            class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleConfirmRequest"
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
                  : validBatchItems.length > 1
                    ? `Confirm & Submit Batch (${validBatchItems.length} torrents)`
                    : 'Confirm & Download'
              }}
            </span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import { api, ApiError } from '../lib/api';
import { useRequestsStore, MediaType, DownloadRequest } from '../stores/requests';
import { formatMediaType, formatBytes } from '../lib/formatters';
import { parseTorrentFile, fileToBase64, ParsedTorrentClient } from '../lib/torrentParser';
import { cleanTorrentTitle, extractEpisodeInfo } from '../lib/torrentTitleCleaner';
import {
  type ReleaseCandidate,
  type CandidateSortOption,
  SORT_OPTIONS,
  sortReleaseCandidates,
} from '../lib/releaseExplorer';

interface MetadataCandidate {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
  romajiTitle?: string | null;
  englishTitle?: string | null;
}

export type { ReleaseCandidate };

export interface BatchItem {
  id: string;
  file: File;
  fileName: string;
  fileSizeBytes: number;
  parsed?: ParsedTorrentClient;
  error?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

const router = useRouter();
const route = useRoute();
const requestsStore = useRequestsStore();

const currentStep = ref<1 | 2 | 3>(1);

// Step 1 State
const inputMode = ref<'search' | 'magnet' | 'file'>('search');
const magnetLink = ref('');
const isSearchingReleases = ref(false);
const recommendedRelease = ref<ReleaseCandidate | null>(null);
const selectedRelease = ref<ReleaseCandidate | null>(null);
const releaseCandidates = ref<ReleaseCandidate[]>([]);
const isExplorerExpanded = ref(false);
const candidateSortBy = ref<CandidateSortOption>('score');
const sortOptions = SORT_OPTIONS;

const activeRelease = computed(() => selectedRelease.value || recommendedRelease.value);
const sortedReleaseCandidates = computed(() =>
  sortReleaseCandidates(releaseCandidates.value, candidateSortBy.value)
);

function selectRelease(candidate: ReleaseCandidate) {
  selectedRelease.value = candidate;
  magnetLink.value = candidate.downloadUrl;
}

function resetToRecommendedRelease() {
  if (recommendedRelease.value) {
    selectedRelease.value = recommendedRelease.value;
    magnetLink.value = recommendedRelease.value.downloadUrl;
  }
}

const releaseSearchError = ref<string | null>(null);
const isProwlarrConfigured = ref(true);
const isProwlarrReachable = ref(true);
const hasHealthyReleases = ref(true);
const showLowHealthAnyway = ref(false);
const isManualFallbackInStep3 = ref(false);
const manualFallbackMode = ref<'magnet' | 'file'>('magnet');
const fallbackMagnetLink = ref('');
const fallbackFile = ref<File | null>(null);

function handleFallbackFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    fallbackFile.value = target.files[0];
  }
}

function switchToManualUpload() {
  isManualFallbackInStep3.value = true;
  manualFallbackMode.value = 'magnet';
}


const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const customQueryInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const parsedTorrent = ref<ParsedTorrentClient | null>(null);

// Batch state
const batchItems = ref<BatchItem[]>([]);
const batchSeasonInput = ref<number | null>(1);

const validBatchItems = computed(() => batchItems.value.filter((i) => !i.error));
const invalidBatchItems = computed(() => batchItems.value.filter((i) => Boolean(i.error)));
const totalBatchSize = computed(() =>
  validBatchItems.value.reduce((acc, i) => acc + (i.parsed?.totalSize || i.fileSizeBytes), 0)
);

const mediaType = ref<MediaType>('movie');
const customQuery = ref('');
const isSearching = ref(false);
const step1Error = ref<string | null>(null);

const mediaTypeOptions: { value: MediaType; label: string; icon: string }[] = [
  { value: 'movie', label: 'Movie', icon: '🎬' },
  { value: 'tv_show', label: 'TV Show', icon: '📺' },
  { value: 'anime', label: 'Anime', icon: '⛩️' },
];

// Step 2 State
const candidates = ref<MetadataCandidate[]>([]);
const selectedCandidate = ref<MetadataCandidate | null>(null);
const step2Error = ref<string | null>(null);
const step2QueryInputRef = ref<HTMLInputElement | null>(null);

// Step 3 State
const seasonNumber = ref<number | null>(null);
const downloadGranularity = ref<'season' | 'episode'>('season');
const episodeNumber = ref<number | null>(1);
const activeAnimeTitle = ref<string | null>(null);
const isSubmitting = ref(false);
const submitProgress = ref({ current: 0, total: 0 });
const step3Error = ref<string | null>(null);

watch(mediaType, (newType) => {
  if (newType === 'movie') {
    seasonNumber.value = null;
    episodeNumber.value = null;
    downloadGranularity.value = 'season';
  } else {
    if (!seasonNumber.value) {
      seasonNumber.value = 1;
    }
    if (downloadGranularity.value === 'episode' && !episodeNumber.value) {
      episodeNumber.value = 1;
    }
  }
});

async function onGranularityChange(val: 'season' | 'episode') {
  downloadGranularity.value = val;
  if (val === 'episode' && !episodeNumber.value) {
    episodeNumber.value = 1;
  }
  if (!seasonNumber.value) {
    seasonNumber.value = 1;
  }
  if (currentStep.value === 3 && inputMode.value === 'search' && selectedCandidate.value) {
    await fetchReleasesForCandidate(selectedCandidate.value);
  }
}

async function onSeasonOrEpisodeChange() {
  if (currentStep.value === 3 && inputMode.value === 'search' && selectedCandidate.value) {
    await fetchReleasesForCandidate(selectedCandidate.value);
  }
}

async function setAnimeTitle(title: string) {
  if (activeAnimeTitle.value === title) return;
  activeAnimeTitle.value = title;
  if (currentStep.value === 3 && inputMode.value === 'search' && selectedCandidate.value) {
    await fetchReleasesForCandidate(selectedCandidate.value);
  }
}

function initFastTrackFromRoute(): boolean {
  const query = route.query;
  const state = (typeof window !== 'undefined' ? (window.history?.state || {}) : {}) as Record<string, any>;

  const rawTitle = (query.title || state.title) as string | undefined;
  const rawMetadataId = (query.metadataId || state.metadataId) as string | undefined;
  const rawDownloadUrl = (query.downloadUrl || state.downloadUrl) as string | undefined;
  const rawMediaType = (query.mediaType || state.mediaType) as string | undefined;

  // If incomplete fast-track parameters are supplied, inform user and remain on Step 1
  if (!rawTitle || !rawMetadataId || !rawDownloadUrl || !rawMediaType) {
    if (query.fastTrack === 'true' || query.downloadUrl || query.releaseTitle || query.metadataId) {
      step1Error.value = 'Incomplete fast-track parameters. Please search or upload manually.';
    }
    return false;
  }

  const validMediaTypes: MediaType[] = ['movie', 'tv_show', 'anime'];
  if (!validMediaTypes.includes(rawMediaType as MediaType)) {
    step1Error.value = 'Invalid media type for fast-track request.';
    return false;
  }

  const mediaTypeValue = rawMediaType as MediaType;
  mediaType.value = mediaTypeValue;

  const rawYear = query.year || state.year;
  const yearNum = rawYear ? parseInt(String(rawYear), 10) : null;

  selectedCandidate.value = {
    id: String(rawMetadataId),
    source: (query.metadataSource === 'anilist' || state.metadataSource === 'anilist') ? 'anilist' : 'tmdb',
    title: String(rawTitle),
    year: yearNum !== null && !isNaN(yearNum) ? yearNum : null,
    posterUrl: (query.posterUrl as string) || state.posterUrl || null,
    overview: (query.overview as string) || state.overview || null,
    romajiTitle: (query.romajiTitle as string) || state.romajiTitle || null,
    englishTitle: (query.englishTitle as string) || state.englishTitle || null,
  };

  if (query.seasonNumber !== undefined || state.seasonNumber !== undefined) {
    const s = parseInt(String(query.seasonNumber ?? state.seasonNumber), 10);
    if (!isNaN(s)) seasonNumber.value = s;
  } else if (mediaTypeValue !== 'movie') {
    seasonNumber.value = 1;
  }

  if (query.episodeNumber !== undefined || state.episodeNumber !== undefined) {
    const e = parseInt(String(query.episodeNumber ?? state.episodeNumber), 10);
    if (!isNaN(e)) {
      episodeNumber.value = e;
      downloadGranularity.value = 'episode';
    } else {
      downloadGranularity.value = 'season';
    }
  } else {
    downloadGranularity.value = 'season';
  }

  const rawSeeders = query.seeders ? parseInt(String(query.seeders), 10) : (state.seeders ?? 10);
  const rawLeechers = query.leechers ? parseInt(String(query.leechers), 10) : (state.leechers ?? 0);
  const rawSizeBytes = query.sizeBytes ? parseInt(String(query.sizeBytes), 10) : (state.sizeBytes ?? 0);
  const rawScore = query.score ? parseInt(String(query.score), 10) : (state.score ?? 100);

  const candidate: ReleaseCandidate = {
    guid: String(query.guid || state.guid || `fast-track-${Date.now()}`),
    title: String(query.releaseTitle || state.releaseTitle || rawTitle),
    downloadUrl: String(rawDownloadUrl),
    indexer: String(query.indexer || state.indexer || 'Indexer'),
    sizeBytes: isNaN(rawSizeBytes) ? 0 : rawSizeBytes,
    formattedSize: String(
      query.formattedSize ||
        state.formattedSize ||
        (rawSizeBytes > 0 ? formatBytes(rawSizeBytes) : 'Unknown')
    ),
    seeders: isNaN(rawSeeders) ? 10 : rawSeeders,
    leechers: isNaN(rawLeechers) ? 0 : rawLeechers,
    resolution: String(query.resolution || state.resolution || '1080p'),
    codec: String(query.codec || state.codec || 'unknown'),
    source: String(query.source || state.source || 'unknown'),
    score: isNaN(rawScore) ? 100 : rawScore,
    isLowHealth: !isNaN(rawSeeders) && rawSeeders < 5,
  };

  recommendedRelease.value = candidate;
  selectedRelease.value = candidate;
  releaseCandidates.value = [candidate];
  magnetLink.value = candidate.downloadUrl;
  inputMode.value = 'search';
  currentStep.value = 3;

  return true;
}

onMounted(async () => {
  const isFastTrack = initFastTrackFromRoute();

  try {
    const status = await api.get<{ isConfigured: boolean; isReachable: boolean }>('/requests/prowlarr-status');
    isProwlarrConfigured.value = status.isConfigured;
    isProwlarrReachable.value = status.isReachable;
    if (!isFastTrack && (!status.isConfigured || !status.isReachable)) {
      inputMode.value = 'magnet';
    }
  } catch (err) {
    if (err instanceof ApiError && err.data && typeof err.data === 'object') {
      const d = err.data as { isConfigured?: boolean; isReachable?: boolean };
      isProwlarrConfigured.value = d.isConfigured ?? false;
      isProwlarrReachable.value = d.isReachable ?? false;
    } else {
      isProwlarrConfigured.value = false;
      isProwlarrReachable.value = false;
    }
    if (!isFastTrack) {
      inputMode.value = 'magnet';
    }
  }
});

watch(magnetLink, async (newVal) => {
  if (inputMode.value !== 'magnet') return;
  const trimmed = newVal.trim();
  if (!trimmed) return;

  const cleaned = cleanTorrentTitle(trimmed);
  if (cleaned.title) {
    customQuery.value = cleaned.title;
  }
  if (cleaned.detectedMediaType) {
    mediaType.value = cleaned.detectedMediaType;
  }
  if (cleaned.seasonNumber !== undefined) {
    seasonNumber.value = cleaned.seasonNumber;
  } else if (cleaned.detectedMediaType === 'movie') {
    seasonNumber.value = null;
  }

  if (!cleaned.title.trim()) {
    await nextTick();
    customQueryInputRef.value?.focus();
  }
});

function applySeasonToAll() {
  if (batchSeasonInput.value === null || isNaN(batchSeasonInput.value)) return;
  const s = batchSeasonInput.value;
  seasonNumber.value = s;
  for (const item of batchItems.value) {
    if (!item.error) {
      item.seasonNumber = s;
    }
  }
}

function removeBatchItem(id: string) {
  batchItems.value = batchItems.value.filter((item) => item.id !== id);
  const firstValid = batchItems.value.find((b) => !b.error);
  if (firstValid) {
    selectedFile.value = firstValid.file;
    parsedTorrent.value = firstValid.parsed || null;
    magnetLink.value = firstValid.parsed?.magnetUri || '';
    if (firstValid.seasonNumber) {
      seasonNumber.value = firstValid.seasonNumber;
      batchSeasonInput.value = firstValid.seasonNumber;
    }
    const cleaned = cleanTorrentTitle(firstValid.parsed?.name || firstValid.fileName);
    if (cleaned.title) {
      customQuery.value = cleaned.title;
    }
  } else {
    selectedFile.value = null;
    parsedTorrent.value = null;
    magnetLink.value = '';
    customQuery.value = '';
    candidates.value = [];
    selectedCandidate.value = null;
    seasonNumber.value = null;
    batchSeasonInput.value = 1;
  }
}

function clearAllBatchItems() {
  batchItems.value = [];
  selectedFile.value = null;
  parsedTorrent.value = null;
  magnetLink.value = '';
  customQuery.value = '';
  candidates.value = [];
  selectedCandidate.value = null;
  seasonNumber.value = null;
  batchSeasonInput.value = 1;
}

async function processFiles(files: FileList | File[]) {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) return;

  step1Error.value = null;

  for (const file of fileArray) {
    const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`;

    if (!file.name.toLowerCase().endsWith('.torrent')) {
      batchItems.value.push({
        id,
        file,
        fileName: file.name,
        fileSizeBytes: file.size,
        error: 'Invalid file type: must be a .torrent file',
      });
      continue;
    }

    try {
      const parsed = await parseTorrentFile(file);
      const episodeInfo = extractEpisodeInfo(file.name);
      const cleaned = cleanTorrentTitle(parsed.name || file.name);

      const detectedSeason = episodeInfo.seasonNumber ?? cleaned.seasonNumber ?? (seasonNumber.value || 1);
      const detectedEp = episodeInfo.episodeNumber;

      const item: BatchItem = {
        id,
        file,
        fileName: file.name,
        fileSizeBytes: parsed.totalSize || file.size,
        parsed,
        seasonNumber: detectedSeason,
        episodeNumber: detectedEp,
      };

      batchItems.value.push(item);

      // Auto-set mediaType to tv_show or anime if episodes detected or multiple items
      if (cleaned.detectedMediaType) {
        mediaType.value = cleaned.detectedMediaType;
      } else if (detectedEp !== undefined || batchItems.value.filter((b) => !b.error).length > 1) {
        if (mediaType.value === 'movie') {
          mediaType.value = 'tv_show';
        }
      }
    } catch (err) {
      batchItems.value.push({
        id,
        file,
        fileName: file.name,
        fileSizeBytes: file.size,
        error: 'Corrupt or unreadable .torrent: ' + ((err as Error).message || 'Invalid format'),
      });
    }
  }

  const firstValid = batchItems.value.find((b) => !b.error);
  if (firstValid) {
    selectedFile.value = firstValid.file;
    parsedTorrent.value = firstValid.parsed || null;
    magnetLink.value = firstValid.parsed?.magnetUri || '';
    if (firstValid.seasonNumber) {
      seasonNumber.value = firstValid.seasonNumber;
      batchSeasonInput.value = firstValid.seasonNumber;
    }
    const cleaned = cleanTorrentTitle(firstValid.parsed?.name || firstValid.fileName);
    if (cleaned.title) {
      customQuery.value = cleaned.title;
    }
  }

  if (!customQuery.value.trim()) {
    await nextTick();
    customQueryInputRef.value?.focus();
  }
}

function handleFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFiles(target.files);
    target.value = '';
  }
}

function handleFileDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    processFiles(e.dataTransfer.files);
  }
}

async function handleSearchMetadata() {
  if (!customQuery.value.trim()) {
    if (currentStep.value === 2) {
      step2Error.value = 'Media Title / Search Query is required.';
      step2QueryInputRef.value?.focus();
    } else {
      step1Error.value = 'Media Title / Search Query is required.';
      customQueryInputRef.value?.focus();
    }
    return;
  }

  if (inputMode.value === 'magnet' && !magnetLink.value.trim()) return;
  if (inputMode.value === 'file' && validBatchItems.value.length === 0) return;

  isSearching.value = true;
  step1Error.value = null;
  step2Error.value = null;

  try {
    const payload: Record<string, any> = {
      mediaType: mediaType.value,
      query: customQuery.value.trim(),
    };

    if (inputMode.value === 'file') {
      const firstValid = validBatchItems.value[0];
      if (firstValid) {
        const base64 = await fileToBase64(firstValid.file);
        payload.torrentFileBase64 = base64;
        payload.magnetLink = firstValid.parsed?.magnetUri || undefined;
      }
    } else if (inputMode.value === 'magnet') {
      payload.magnetLink = magnetLink.value.trim();
    }

    const data = await api.post<{ candidates: MetadataCandidate[] }>('/requests/search-metadata', payload);

    candidates.value = data.candidates || [];
    selectedCandidate.value = candidates.value.length > 0 ? candidates.value[0] : null;
    currentStep.value = 2;
  } catch (err) {
    const msg =
      err instanceof ApiError
        ? err.message
        : 'Failed to search metadata. Please check the input.';
    if (currentStep.value === 2) {
      step2Error.value = msg;
    } else {
      step1Error.value = msg;
    }
  } finally {
    isSearching.value = false;
  }
}

async function fetchReleasesForCandidate(candidate: MetadataCandidate) {
  isSearchingReleases.value = true;
  releaseSearchError.value = null;
  recommendedRelease.value = null;
  selectedRelease.value = null;
  releaseCandidates.value = [];
  showLowHealthAnyway.value = false;
  isManualFallbackInStep3.value = false;
  fallbackMagnetLink.value = '';
  fallbackFile.value = null;

  const effectiveEpisode = downloadGranularity.value === 'episode' ? (episodeNumber.value ?? 1) : null;
  const effectiveSeason = mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : null;

  const isEnglishSelected = Boolean(candidate.englishTitle && activeAnimeTitle.value === candidate.englishTitle);
  const primaryTitle = isEnglishSelected
    ? candidate.englishTitle!
    : (activeAnimeTitle.value || candidate.romajiTitle || candidate.title);
  const fallbackTitle = isEnglishSelected
    ? (candidate.romajiTitle || candidate.title)
    : candidate.englishTitle;

  try {
    const data = await api.post<{
      recommended: ReleaseCandidate | null;
      candidates: ReleaseCandidate[];
      totalFound: number;
      isConfigured: boolean;
      isReachable?: boolean;
      hasHealthyReleases?: boolean;
    }>('/requests/search-releases', {
      metadataId: candidate.id,
      metadataSource: candidate.source,
      mediaType: mediaType.value,
      title: primaryTitle,
      year: candidate.year,
      seasonNumber: effectiveSeason,
      episodeNumber: effectiveEpisode,
      romajiTitle: isEnglishSelected ? primaryTitle : (candidate.romajiTitle || candidate.title),
      englishTitle: isEnglishSelected ? fallbackTitle : candidate.englishTitle,
    });

    isProwlarrConfigured.value = data.isConfigured;
    isProwlarrReachable.value = data.isReachable ?? true;
    hasHealthyReleases.value = data.hasHealthyReleases ?? (data.candidates && data.candidates.some((c) => !c.isLowHealth));
    recommendedRelease.value = data.recommended;
    releaseCandidates.value = data.candidates || [];
    selectedRelease.value = data.recommended;

    if (selectedRelease.value) {
      magnetLink.value = selectedRelease.value.downloadUrl;
    }
  } catch (err) {
    if (err instanceof ApiError && err.data && typeof err.data === 'object') {
      const d = err.data as { isConfigured?: boolean; isReachable?: boolean; message?: string };
      isProwlarrConfigured.value = d.isConfigured ?? false;
      isProwlarrReachable.value = d.isReachable ?? false;
      hasHealthyReleases.value = false;
      releaseSearchError.value = d.message || err.message;
    } else {
      releaseSearchError.value =
        err instanceof ApiError ? err.message : 'Failed to search releases for this title.';
    }
  } finally {
    isSearchingReleases.value = false;
  }
}

async function selectCandidate(candidate: MetadataCandidate) {
  selectedCandidate.value = candidate;
  activeAnimeTitle.value = candidate.romajiTitle || candidate.title;
  currentStep.value = 3;
  if (inputMode.value === 'search') {
    await fetchReleasesForCandidate(candidate);
  }
}

async function handleConfirmRequest() {
  if (!selectedCandidate.value) return;

  isSubmitting.value = true;
  step3Error.value = null;

  try {
    if (inputMode.value === 'file' && validBatchItems.value.length > 1) {
      submitProgress.value = { current: 0, total: validBatchItems.value.length };

      const itemsPayload = [];
      for (let i = 0; i < validBatchItems.value.length; i++) {
        const item = validBatchItems.value[i];
        submitProgress.value.current = i + 1;
        const base64 = await fileToBase64(item.file);
        itemsPayload.push({
          torrentFileBase64: base64,
          torrentFileName: item.fileName,
          magnetLink: item.parsed?.magnetUri || undefined,
          seasonNumber: item.seasonNumber ?? seasonNumber.value ?? undefined,
          episodeNumber: item.episodeNumber ?? undefined,
        });
      }

      const batchPayload = {
        mediaType: mediaType.value,
        metadataId: selectedCandidate.value.id,
        metadataSource: selectedCandidate.value.source,
        title: selectedCandidate.value.title,
        year: selectedCandidate.value.year ?? undefined,
        seasonNumber: seasonNumber.value ?? undefined,
        items: itemsPayload,
      };

      const res = await api.post<{ requests: DownloadRequest[]; count: number }>('/requests/batch', batchPayload);

      const queuedCount = res.requests.filter((r) => r.status === 'queued').length;
      const downloadingCount = res.requests.filter((r) => r.status === 'downloading').length;

      if (downloadingCount > 0 && queuedCount > 0) {
        requestsStore.showToast(
          `Batch submitted: ${downloadingCount} downloading, ${queuedCount} queued`,
          'success'
        );
      } else if (queuedCount > 0) {
        requestsStore.showToast(
          `Batch submitted: ${queuedCount} request(s) queued`,
          'info'
        );
      } else {
        requestsStore.showToast(
          `Batch submitted: ${res.count} download(s) started`,
          'success'
        );
      }

      router.push('/dashboard');
    } else {
      submitProgress.value = { current: 0, total: 1 };
      const singleItem = validBatchItems.value[0];
      const effectiveSeason = singleItem?.seasonNumber ?? (mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : undefined);
      const effectiveEpisode = singleItem?.episodeNumber ?? (downloadGranularity.value === 'episode' ? (episodeNumber.value ?? 1) : undefined);

      const payload: Record<string, any> = {
        mediaType: mediaType.value,
        metadataId: selectedCandidate.value.id,
        metadataSource: selectedCandidate.value.source,
        title: selectedCandidate.value.title,
        year: selectedCandidate.value.year ?? undefined,
        seasonNumber: effectiveSeason ?? undefined,
        episodeNumber: effectiveEpisode ?? undefined,
      };

      if (inputMode.value === 'file') {
        const fileToUpload = singleItem?.file || selectedFile.value;
        if (!fileToUpload) throw new Error('No torrent file selected');
        const base64 = await fileToBase64(fileToUpload);
        payload.torrentFileBase64 = base64;
        payload.torrentFileName = fileToUpload.name;
        payload.magnetLink = singleItem?.parsed?.magnetUri || magnetLink.value || undefined;
      } else if (inputMode.value === 'search') {
        if (isManualFallbackInStep3.value) {
          if (manualFallbackMode.value === 'file') {
            if (!fallbackFile.value) throw new Error('No torrent file selected');
            const base64 = await fileToBase64(fallbackFile.value);
            payload.torrentFileBase64 = base64;
            payload.torrentFileName = fallbackFile.value.name;
          } else {
            const link = fallbackMagnetLink.value.trim();
            if (!link) throw new Error('No magnet link provided');
            payload.magnetLink = link;
          }
        } else {
          const link = selectedRelease.value?.downloadUrl || recommendedRelease.value?.downloadUrl || magnetLink.value.trim();
          if (!link) throw new Error('No torrent release selected');
          payload.magnetLink = link;
        }
      } else {
        payload.magnetLink = magnetLink.value.trim();
      }

      const res = await api.post<{ request: DownloadRequest }>('/requests', payload);

      if (res.request.status === 'queued') {
        if (res.request.deferredReason === 'waiting_for_space') {
          requestsStore.showToast(
            'Your request has been queued and will start automatically once storage space is available',
            'info'
          );
        } else {
          requestsStore.showToast(
            'Your request has been queued and will start when a download slot is available',
            'info'
          );
        }
      } else {
        requestsStore.showToast(
          `Download started: ${res.request.title}`,
          'success'
        );
      }

      router.push('/dashboard');
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.statusCode === 422) {
        step3Error.value =
          'Not enough disk space — please ask an admin to free up space.';
      } else {
        step3Error.value = err.message;
      }
    } else {
      step3Error.value = ((err as Error).message) || 'Failed to submit download request.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>
