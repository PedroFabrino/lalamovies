<template>
  <div>
    <!-- Disabled Feature Warning Banner (Subtask #91) -->
    <div
      v-if="!isManualTorrentsEnabled"
      class="mb-6 p-4 rounded-xl border border-amber-800 bg-amber-950/40 text-amber-200 flex items-start gap-3 shadow-lg"
      data-testid="manual-torrents-disabled-banner"
    >
      <svg
        class="w-5 h-5 text-amber-400 shrink-0 mt-0.5"
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
      <div class="text-sm">
        <p class="font-semibold text-white">
          Manual Torrent Submissions Temporarily Disabled
        </p>
        <p class="text-amber-300/90 mt-0.5">
          Administrators have paused new torrent submissions for system maintenance or storage safety. You cannot submit new requests at this time.
        </p>
      </div>
    </div>

    <!-- Step 1 Card -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
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
          class="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
          :class="inputMode === 'search' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          @click="$emit('update:inputMode', 'search')"
        >
          <span>🔍</span>
          <span>Search</span>
        </button>
        <button
          type="button"
          class="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
          :class="inputMode === 'magnet' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          @click="$emit('update:inputMode', 'magnet')"
        >
          <span>🧲</span>
          <span>Magnet Link</span>
        </button>
        <button
          type="button"
          class="flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
          :class="inputMode === 'file' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          @click="$emit('update:inputMode', 'file')"
        >
          <span>📄</span>
          <span>Torrent File</span>
        </button>
      </div>

      <form
        class="space-y-6"
        @submit.prevent="$emit('search')"
      >
        <!-- Search Mode banner -->
        <div
          v-if="inputMode === 'search'"
          class="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-400"
        >
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
            :value="magnetLink"
            rows="4"
            required
            :disabled="isSearching"
            placeholder="magnet:?xt=urn:btih:..."
            class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            @input="$emit('update:magnetLink', ($event.target as HTMLTextAreaElement).value)"
          />
          <p class="text-xs text-zinc-500 mt-1.5">
            Paste the full magnet URI from your torrent indexer.
          </p>
        </div>

        <!-- Torrent file dropzone / batch list -->
        <div
          v-else-if="inputMode === 'file'"
          class="space-y-3"
        >
          <div class="flex items-center justify-between">
            <label class="block text-sm font-medium text-zinc-300">
              Upload .torrent Files
            </label>
            <span
              v-if="batchItems.length > 0"
              class="text-xs text-zinc-400"
            >
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
            @change="onFileInputChange"
          >

          <!-- Drag & Drop Zone if no items -->
          <div
            v-if="batchItems.length === 0"
            class="relative border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer"
            :class="isDragging
              ? 'border-indigo-500 bg-indigo-950/20 ring-4 ring-indigo-500/10'
              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/30'"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onFileDrop"
            @click="fileInputRef?.click()"
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
            class="rounded-xl border p-4 transition"
            :class="isDragging
              ? 'border-indigo-500 bg-indigo-950/20 ring-4 ring-indigo-500/10'
              : 'border-zinc-800 bg-zinc-950/60'"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onFileDrop"
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
                  class="px-2.5 py-1 text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800/50 rounded-md transition cursor-pointer flex items-center gap-1"
                  @click="fileInputRef?.click()"
                >
                  <span>+</span>
                  <span>Add More</span>
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-red-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition cursor-pointer"
                  @click="$emit('clearAllBatchItems')"
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
                    <div
                      class="font-medium truncate"
                      :title="item.fileName"
                    >
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
                      <span
                        v-if="item.error"
                        class="text-red-400 font-medium"
                      >
                        {{ item.error }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Remove badge button -->
                <button
                  type="button"
                  class="shrink-0 w-6 h-6 rounded flex items-center justify-center transition cursor-pointer"
                  :class="item.error
                    ? 'text-red-400 hover:bg-red-900/60 hover:text-red-200'
                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'"
                  title="Remove file"
                  @click.stop="$emit('removeBatchItem', item.id)"
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
                type="radio"
                name="mediaType"
                :value="type.value"
                :checked="mediaType === type.value"
                class="sr-only"
                @change="$emit('update:mediaType', type.value)"
              >
              <span class="text-lg mb-1">{{ type.icon }}</span>
              <span class="text-xs sm:text-sm font-medium">{{ type.label }}</span>
            </label>
          </div>
        </div>

        <!-- Private Episodic Checkbox -->
        <div
          v-if="mediaType === 'private'"
          class="flex items-center gap-2 p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl"
        >
          <input
            id="privateEpisodicToggle"
            :checked="isPrivateEpisodic"
            type="checkbox"
            class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
            @change="$emit('update:isPrivateEpisodic', ($event.target as HTMLInputElement).checked)"
          >
          <label
            for="privateEpisodicToggle"
            class="text-xs text-zinc-300 cursor-pointer select-none"
          >
            This is an episodic series (organize into Season / Episode folders)
          </label>
        </div>

        <!-- Scope & Season / Episode Inputs (Step 1 - TV Show, Anime, & Episodic Private) -->
        <div
          v-if="mediaType === 'tv_show' || mediaType === 'anime' || (mediaType === 'private' && isPrivateEpisodic)"
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
              class="py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
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
              class="py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
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
                for="step1SeasonNumber"
                class="block text-xs font-medium text-zinc-400 mb-1"
              >
                Season Number
              </label>
              <input
                id="step1SeasonNumber"
                :value="seasonNumber"
                type="number"
                min="1"
                placeholder="1"
                :disabled="isSearching"
                class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
                @input="$emit('update:seasonNumber', ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : null)"
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
                :value="episodeNumber"
                type="number"
                min="1"
                placeholder="1"
                :disabled="isSearching"
                class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
                @input="$emit('update:episodeNumber', ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : null)"
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
            :value="customQuery"
            type="text"
            required
            :disabled="isSearching"
            placeholder="e.g. Inception, Breaking Bad, Jujutsu Kaisen"
            class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            @input="$emit('update:customQuery', ($event.target as HTMLInputElement).value)"
          >
          <p class="text-xs text-zinc-500 mt-1.5">
            Clean title used to search TMDB or AniList for metadata matching.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="submit"
            :disabled="isSearching || !customQuery.trim() || (inputMode === 'magnet' && !magnetLink.trim()) || (inputMode === 'file' && validBatchItems.length === 0)"
            class="w-full sm:flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

          <button
            v-if="mediaType === 'private'"
            type="button"
            :disabled="isSearching || !customQuery.trim() || (inputMode === 'magnet' && !magnetLink.trim()) || (inputMode === 'file' && validBatchItems.length === 0)"
            class="w-full sm:w-auto py-2.5 px-4 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/60 text-sm font-medium rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            @click="$emit('skipMetadata')"
          >
            <span>Skip Metadata</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { MediaType } from '../../stores/requests';
import type { BatchItem } from '../../views/RequestView.vue';

defineProps<{
  inputMode: 'search' | 'magnet' | 'file';
  magnetLink: string;
  mediaType: MediaType;
  isPrivateEpisodic: boolean;
  downloadGranularity: 'season' | 'episode';
  seasonNumber: number | null;
  episodeNumber: number | null;
  customQuery: string;
  batchItems: BatchItem[];
  validBatchItems: BatchItem[];
  invalidBatchItems: BatchItem[];
  totalBatchSize: number;
  isSearching: boolean;
  step1Error: string | null;
  isProwlarrConfigured: boolean;
  isProwlarrReachable: boolean;
  isManualTorrentsEnabled: boolean;
  mediaTypeOptions: { value: MediaType; label: string; icon: string }[];
  formatBytes: (bytes: number) => string;
}>();

const emit = defineEmits<{
  (e: 'update:inputMode', val: 'search' | 'magnet' | 'file'): void;
  (e: 'update:magnetLink', val: string): void;
  (e: 'update:mediaType', val: MediaType): void;
  (e: 'update:isPrivateEpisodic', val: boolean): void;
  (e: 'update:downloadGranularity', val: 'season' | 'episode'): void;
  (e: 'update:seasonNumber', val: number | null): void;
  (e: 'update:episodeNumber', val: number | null): void;
  (e: 'update:customQuery', val: string): void;
  (e: 'search'): void;
  (e: 'skipMetadata'): void;
  (e: 'granularityChange', val: 'season' | 'episode'): void;
  (e: 'processFiles', files: FileList | File[]): void;
  (e: 'removeBatchItem', id: string): void;
  (e: 'clearAllBatchItems'): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const customQueryInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

function onFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    emit('processFiles', target.files);
    target.value = '';
  }
}

function onFileDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    emit('processFiles', e.dataTransfer.files);
  }
}

defineExpose({
  customQueryInputRef,
});
</script>
