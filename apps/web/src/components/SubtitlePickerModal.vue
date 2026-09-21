<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    data-testid="subtitle-picker-modal"
    @click.self="handleClose"
  >
    <div
      class="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-100 flex flex-col max-h-[90vh]"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span>💬</span>
            <span>Subtitles (pt-BR)</span>
          </h3>
          <p class="text-xs text-zinc-400 mt-0.5 truncate max-w-md" :title="title">
            {{ title || 'Select OpenSubtitles track' }}
          </p>
        </div>
        <button
          type="button"
          data-testid="close-modal-btn"
          class="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          :disabled="isApplying"
          @click="handleClose"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Error / Notice Banner -->
      <div
        v-if="applyError"
        data-testid="apply-error-banner"
        class="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center justify-between gap-2"
      >
        <span>{{ applyError }}</span>
        <button
          type="button"
          class="text-red-400 hover:text-red-200 text-xs underline"
          @click="applyError = null"
        >
          Dismiss
        </button>
      </div>

      <!-- Quick Action: Re-fetch Best -->
      <div class="flex items-center justify-between bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
        <div class="text-xs text-zinc-300">
          <span class="font-medium text-white">Auto-pick:</span>
          <span class="text-zinc-400 ml-1">Download the highest-rated subtitle automatically.</span>
        </div>
        <button
          type="button"
          data-testid="refetch-best-btn"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          :disabled="isApplying || loading"
          @click="handleFetchBest"
        >
          <svg
            v-if="applyingTarget === 'best'"
            class="animate-spin w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Re-fetch Best</span>
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[160px]">
        <!-- Loading Spinner -->
        <div
          v-if="loading"
          data-testid="loading-state"
          class="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400"
        >
          <div class="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p class="text-xs">Searching OpenSubtitles...</p>
        </div>

        <!-- Service Not Configured -->
        <div
          v-else-if="serviceNotConfigured"
          data-testid="not-configured-state"
          class="py-10 text-center bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-6"
        >
          <div class="w-10 h-10 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg mb-2">
            ⚠️
          </div>
          <h4 class="text-sm font-semibold text-white">OpenSubtitles Not Configured</h4>
          <p class="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            OPENSUBTITLES_API_KEY is not configured on the server. Configure an API key to enable subtitle downloads.
          </p>
        </div>

        <!-- Load Error -->
        <div
          v-else-if="loadError"
          data-testid="load-error-state"
          class="py-8 text-center bg-red-950/20 border border-red-800/40 rounded-xl p-6"
        >
          <p class="text-xs text-red-300">{{ loadError }}</p>
          <button
            type="button"
            class="mt-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-lg transition cursor-pointer"
            @click="fetchSubtitles"
          >
            Retry Search
          </button>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="subtitles.length === 0"
          data-testid="empty-state"
          class="py-10 text-center bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-6"
        >
          <div class="w-10 h-10 mx-auto rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center text-lg mb-2">
            🔍
          </div>
          <h4 class="text-sm font-semibold text-white">No Subtitles Found</h4>
          <p class="text-xs text-zinc-400 mt-1">
            No matching pt-BR subtitles were found on OpenSubtitles for this title.
          </p>
        </div>

        <!-- Subtitles List -->
        <div v-else class="space-y-2">
          <div
            v-for="sub in subtitles"
            :key="sub.fileId"
            data-testid="subtitle-row"
            class="p-3 bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 rounded-xl transition flex items-center justify-between gap-3"
            :class="{ 'ring-1 ring-indigo-500/60 bg-zinc-900/90': isSelected(sub.fileId) }"
          >
            <!-- Checkbox & Release Name -->
            <div class="flex items-start gap-3 flex-1 min-w-0">
              <input
                type="checkbox"
                data-testid="subtitle-checkbox"
                :checked="isSelected(sub.fileId)"
                :disabled="isApplying"
                class="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                @change="toggleSelect(sub.fileId)"
              />
              <div class="min-w-0 flex-1">
                <div class="text-xs font-semibold text-zinc-100 truncate" :title="sub.releaseName">
                  {{ sub.releaseName }}
                </div>
                <div class="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-zinc-400">
                  <span class="text-zinc-300 font-medium">@{{ sub.uploaderName }}</span>
                  <span>•</span>
                  <span class="text-indigo-400 font-mono">⬇ {{ formatDownloadCount(sub.downloadCount) }}</span>
                  <span v-if="sub.fileSizeBytes">•</span>
                  <span v-if="sub.fileSizeBytes" class="font-mono">{{ formatBytes(sub.fileSizeBytes) }}</span>
                  <span v-if="sub.uploadDate">•</span>
                  <span v-if="sub.uploadDate">{{ formatDate(sub.uploadDate) }}</span>
                </div>
              </div>
            </div>

            <!-- Row Apply Button -->
            <button
              type="button"
              data-testid="apply-row-btn"
              class="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
              :disabled="isApplying"
              @click="handleApplySingle(sub.fileId)"
            >
              <svg
                v-if="applyingTarget === sub.fileId"
                class="animate-spin w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Action Bar -->
      <div class="flex items-center justify-between border-t border-zinc-800 pt-4">
        <button
          type="button"
          class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg transition cursor-pointer"
          :disabled="isApplying"
          @click="handleClose"
        >
          Cancel
        </button>

        <button
          type="button"
          data-testid="apply-selected-btn"
          class="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          :disabled="selectedIds.size === 0 || isApplying"
          @click="handleApplySelected"
        >
          <svg
            v-if="applyingTarget === 'selected'"
            class="animate-spin w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>
            {{ selectedIds.size > 0 ? `Apply Selected (${selectedIds.size})` : 'Apply Selected' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { api } from '../lib/api';
import { useRequestsStore } from '../stores/requests';
import { formatBytes } from '../lib/formatters';

export interface SubtitleItem {
  fileId: number | string;
  uploaderName: string;
  downloadCount: number;
  uploadDate: string;
  fileSizeBytes?: number;
  releaseName: string;
}

const props = defineProps<{
  show: boolean;
  requestId: string;
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'applied', count: number): void;
}>();

const requestsStore = useRequestsStore();

const loading = ref(false);
const serviceNotConfigured = ref(false);
const loadError = ref<string | null>(null);
const applyError = ref<string | null>(null);
const subtitles = ref<SubtitleItem[]>([]);
const selectedIds = ref<Set<number | string>>(new Set());

const isApplying = ref(false);
const applyingTarget = ref<number | string | 'selected' | 'best' | null>(null);

function formatDownloadCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function isSelected(id: number | string): boolean {
  return selectedIds.value.has(id);
}

function toggleSelect(id: number | string): void {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
}

function handleClose(): void {
  if (isApplying.value) return;
  emit('close');
}

async function fetchSubtitles(): Promise<void> {
  if (!props.requestId) return;

  loading.value = true;
  serviceNotConfigured.value = false;
  loadError.value = null;
  applyError.value = null;
  selectedIds.value = new Set();
  subtitles.value = [];

  try {
    const res = await api.get<{ subtitles: SubtitleItem[] }>(`/requests/${props.requestId}/subtitles`);
    subtitles.value = res.subtitles || [];
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string } | null;
    if (error?.status === 503) {
      serviceNotConfigured.value = true;
    } else {
      loadError.value = error?.message || 'Failed to search subtitles';
    }
  } finally {
    loading.value = false;
  }
}

async function handleApplySingle(fileId: number | string): Promise<void> {
  isApplying.value = true;
  applyingTarget.value = fileId;
  applyError.value = null;

  try {
    await api.post(`/requests/${props.requestId}/subtitles/fetch`, { fileId });
    requestsStore.showToast('Subtitle applied successfully!', 'success');
    emit('applied', 1);
    emit('close');
  } catch (err: unknown) {
    applyError.value = (err as { message?: string })?.message || 'Failed to apply subtitle';
  } finally {
    isApplying.value = false;
    applyingTarget.value = null;
  }
}

async function handleApplySelected(): Promise<void> {
  if (selectedIds.value.size === 0) return;

  isApplying.value = true;
  applyingTarget.value = 'selected';
  applyError.value = null;

  try {
    const fileIds = Array.from(selectedIds.value);
    const res = await api.post<{ success: boolean; count?: number }>(
      `/requests/${props.requestId}/subtitles/fetch`,
      { fileIds }
    );
    const count = res?.count || fileIds.length;
    requestsStore.showToast(
      `${count} subtitle${count > 1 ? 's' : ''} applied successfully!`,
      'success'
    );
    emit('applied', count);
    emit('close');
  } catch (err: unknown) {
    applyError.value = (err as { message?: string })?.message || 'Failed to apply selected subtitles';
  } finally {
    isApplying.value = false;
    applyingTarget.value = null;
  }
}

async function handleFetchBest(): Promise<void> {
  isApplying.value = true;
  applyingTarget.value = 'best';
  applyError.value = null;

  try {
    await api.post(`/requests/${props.requestId}/subtitles/fetch`, {});
    requestsStore.showToast('Best subtitle fetched successfully!', 'success');
    emit('applied', 1);
    emit('close');
  } catch (err: unknown) {
    applyError.value = (err as { message?: string })?.message || 'Failed to fetch best subtitle';
  } finally {
    isApplying.value = false;
    applyingTarget.value = null;
  }
}

watch(
  () => [props.show, props.requestId],
  ([newShow]) => {
    if (newShow) {
      fetchSubtitles();
    }
  },
  { immediate: true }
);
</script>
