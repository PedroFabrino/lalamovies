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

        <!-- Input Mode Switcher Tabs -->
        <div class="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-lg max-w-xs mb-6">
          <button
            type="button"
            @click="inputMode = 'file'"
            class="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            :class="inputMode === 'file' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          >
            <span>📄</span>
            <span>Torrent File</span>
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
        </div>

        <form
          class="space-y-6"
          @submit.prevent="handleSearchMetadata"
        >
          <!-- Magnet link input -->
          <div v-if="inputMode === 'magnet'">
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
          <div v-else class="space-y-3">
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

          <!-- Season Input (Step 1 - TV Show & Anime) -->
          <div
            v-if="mediaType === 'tv_show' || mediaType === 'anime'"
          >
            <label
              for="step1SeasonNumber"
              class="block text-sm font-medium text-zinc-300 mb-2"
            >
              Season Number <span class="text-xs text-zinc-500 font-normal">(Optional)</span>
            </label>
            <input
              id="step1SeasonNumber"
              v-model.number="seasonNumber"
              type="number"
              min="1"
              placeholder="e.g. 1"
              :disabled="isSearching"
              class="w-32 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            >
            <p class="text-xs text-zinc-500 mt-1.5">
              Specify season for TV show folder structure (e.g. Season 01).
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
            :disabled="isSearching || !customQuery.trim() || (inputMode === 'magnet' ? !magnetLink.trim() : validBatchItems.length === 0)"
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
            @click="currentStep = 1"
          >
            Back to Step 1
          </button>
        </div>

        <div
          v-if="candidates.length === 0"
          class="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center"
        >
          <p class="text-zinc-400 text-sm mb-4">
            No metadata matches found for this query.
          </p>
          <button
            type="button"
            class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition cursor-pointer"
            @click="currentStep = 1"
          >
            Edit Search Query
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
          <!-- TV Show / Anime Season input -->
          <div
            v-if="mediaType === 'tv_show' || mediaType === 'anime'"
            class="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4"
          >
            <label
              for="seasonNumber"
              class="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Season Number <span class="text-xs text-zinc-500 font-normal">(Optional)</span>
            </label>
            <input
              id="seasonNumber"
              v-model.number="seasonNumber"
              type="number"
              min="1"
              placeholder="e.g. 1"
              :disabled="isSubmitting"
              class="w-32 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            />
            <p class="text-xs text-zinc-500 mt-1">
              Specify season for TV show folder structure (e.g. Season 01). Leave empty if torrent contains multiple seasons.
            </p>
          </div>

          <!-- Source summary -->
          <div class="text-xs text-zinc-500 break-all bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
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
            :disabled="isSubmitting || (inputMode === 'file' && validBatchItems.length === 0)"
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
import { ref, computed, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import { api, ApiError } from '../lib/api';
import { useRequestsStore, MediaType, DownloadRequest } from '../stores/requests';
import { formatMediaType, formatBytes } from '../lib/formatters';
import { parseTorrentFile, fileToBase64, ParsedTorrentClient } from '../lib/torrentParser';
import { cleanTorrentTitle, extractEpisodeInfo } from '../lib/torrentTitleCleaner';

interface MetadataCandidate {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
}

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
const requestsStore = useRequestsStore();

const currentStep = ref<1 | 2 | 3>(1);

// Step 1 State
const inputMode = ref<'magnet' | 'file'>('file');
const magnetLink = ref('');
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

// Step 3 State
const seasonNumber = ref<number | null>(null);
const isSubmitting = ref(false);
const submitProgress = ref({ current: 0, total: 0 });
const step3Error = ref<string | null>(null);

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
    step1Error.value = 'Media Title / Search Query is required.';
    customQueryInputRef.value?.focus();
    return;
  }

  if (inputMode.value === 'magnet' && !magnetLink.value.trim()) return;
  if (inputMode.value === 'file' && validBatchItems.value.length === 0) return;

  isSearching.value = true;
  step1Error.value = null;

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
    } else {
      payload.magnetLink = magnetLink.value.trim();
    }

    const data = await api.post<{ candidates: MetadataCandidate[] }>('/requests/search-metadata', payload);

    candidates.value = data.candidates || [];
    selectedCandidate.value = candidates.value.length > 0 ? candidates.value[0] : null;
    currentStep.value = 2;
  } catch (err) {
    if (err instanceof ApiError) {
      step1Error.value = err.message;
    } else {
      step1Error.value = 'Failed to search metadata. Please check the input.';
    }
  } finally {
    isSearching.value = false;
  }
}

function selectCandidate(candidate: MetadataCandidate) {
  selectedCandidate.value = candidate;
  currentStep.value = 3;
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
      const payload: Record<string, any> = {
        mediaType: mediaType.value,
        metadataId: selectedCandidate.value.id,
        metadataSource: selectedCandidate.value.source,
        title: selectedCandidate.value.title,
        year: selectedCandidate.value.year ?? undefined,
        seasonNumber: singleItem?.seasonNumber ?? seasonNumber.value ?? undefined,
        episodeNumber: singleItem?.episodeNumber ?? undefined,
      };

      if (inputMode.value === 'file') {
        const fileToUpload = singleItem?.file || selectedFile.value;
        if (!fileToUpload) throw new Error('No torrent file selected');
        const base64 = await fileToBase64(fileToUpload);
        payload.torrentFileBase64 = base64;
        payload.torrentFileName = fileToUpload.name;
        payload.magnetLink = singleItem?.parsed?.magnetUri || magnetLink.value || undefined;
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
