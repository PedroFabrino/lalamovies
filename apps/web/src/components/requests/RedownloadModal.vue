<template>
  <div
    v-if="show && item"
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    data-testid="redownload-modal"
  >
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-5">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-indigo-950/60 border border-indigo-800/80 flex items-center justify-center text-indigo-400 shrink-0">
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">
              Redownload Media
            </h3>
            <p class="text-xs text-zinc-400">
              Choose how you want to re-queue this item
            </p>
          </div>
        </div>
        <button
          type="button"
          class="p-1.5 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
          :disabled="isSubmitting"
          @click="$emit('close')"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Item Summary Box -->
      <div class="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3.5 space-y-2 text-xs">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-semibold text-white truncate">{{ item.title }}</span>
          <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
            {{ formatMediaType(item.mediaType) }}
          </span>
        </div>
        <div
          v-if="formatMediaSubtitle(item)"
          class="text-indigo-400 font-mono"
        >
          {{ formatMediaSubtitle(item) }}
        </div>
        <div class="flex items-center gap-3 text-zinc-400 text-[11px] pt-1 border-t border-zinc-800/60">
          <span v-if="item.year">Year: {{ item.year }}</span>
          <span v-if="item.deletionReason">Reason: {{ item.deletionReason === 'cleanup' ? 'Space Cleanup' : 'Manual Delete' }}</span>
        </div>
        <div
          v-if="item.magnetLink"
          class="text-[11px] text-zinc-500 font-mono truncate"
          :title="item.magnetLink"
        >
          Original Magnet: {{ item.magnetLink?.slice(0, 45) }}...
        </div>
      </div>

      <!-- Error Alert -->
      <div
        v-if="errorMessage"
        class="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200 flex items-start gap-2"
        data-testid="redownload-error-alert"
      >
        <svg
          class="w-4 h-4 text-red-400 shrink-0 mt-0.5"
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
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Choice Descriptions -->
      <div class="space-y-3">
        <!-- Option 1: Original Source -->
        <button
          type="button"
          :disabled="isSubmitting"
          class="w-full text-left p-3.5 rounded-xl border border-zinc-800 hover:border-indigo-600 bg-zinc-900/60 hover:bg-indigo-950/20 transition group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="btn-use-original-source"
          @click="handleUseOriginalSource"
        >
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <div class="text-sm font-semibold text-white group-hover:text-indigo-300 transition flex items-center gap-2">
                <span>Use Original Source</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/60">Fastest</span>
              </div>
              <p class="text-xs text-zinc-400">
                Immediately re-queues download with the previously saved magnet link.
              </p>
            </div>
            <svg
              v-if="isSubmitting"
              class="w-5 h-5 animate-spin text-indigo-400 shrink-0 mt-1"
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
            <svg
              v-else
              class="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 transition shrink-0 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </button>

        <!-- Option 2: Search New Source -->
        <button
          type="button"
          :disabled="isSubmitting"
          class="w-full text-left p-3.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/40 transition group cursor-pointer disabled:opacity-50"
          data-testid="btn-search-new-source"
          @click="handleSearchNewSource"
        >
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <div class="text-sm font-semibold text-white group-hover:text-zinc-200 transition flex items-center gap-2">
                <span>Search / Choose New Source</span>
              </div>
              <p class="text-xs text-zinc-400">
                Opens the request search drawer pre-filled with this title to select a healthier release or paste a new magnet.
              </p>
            </div>
            <svg
              class="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition shrink-0 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </button>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end pt-2">
        <button
          type="button"
          class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
          :disabled="isSubmitting"
          @click="$emit('close')"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useRequestsStore, DownloadRequest } from '../../stores/requests';
import { formatMediaType, formatMediaSubtitle } from '../../lib/formatters';

const props = defineProps<{
  show: boolean;
  item: DownloadRequest | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'redownloaded', newReq: DownloadRequest): void;
}>();

const router = useRouter();
const requestsStore = useRequestsStore();

const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

watch(() => props.show, (newVal) => {
  if (newVal) {
    errorMessage.value = null;
    isSubmitting.value = false;
  }
});

async function handleUseOriginalSource(): Promise<void> {
  if (!props.item) return;
  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const newReq = await requestsStore.redownload(props.item.id);
    emit('redownloaded', newReq);
    emit('close');
  } catch (err) {
    errorMessage.value = (err as Error).message || 'Failed to redownload';
  } finally {
    isSubmitting.value = false;
  }
}

function handleSearchNewSource(): void {
  if (!props.item) return;
  emit('close');
  router.push({
    path: '/request',
    query: {
      title: props.item.title,
      mediaType: props.item.mediaType,
      year: props.item.year ? String(props.item.year) : undefined,
      season: props.item.seasonNumber != null ? String(props.item.seasonNumber) : undefined,
      episode: props.item.episodeNumber != null ? String(props.item.episodeNumber) : undefined,
      metadataId: props.item.metadataId,
      metadataSource: props.item.metadataSource,
    },
  });
}
</script>
