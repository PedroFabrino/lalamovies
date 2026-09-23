<template>
  <div
    v-if="open && item"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    data-testid="torrent-replacement-modal"
    @click.self="handleClose"
  >
    <div
      class="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-100 flex flex-col max-h-[90vh]"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span>🔄</span>
            <span>Replace Underway Torrent</span>
          </h3>
          <p
            class="text-xs text-zinc-400 mt-0.5 truncate max-w-lg"
            :title="item.title"
          >
            {{ subtitleText }}
          </p>
        </div>
        <button
          type="button"
          data-testid="close-modal-btn"
          class="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          :disabled="isSubmitting"
          @click="handleClose"
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

      <!-- Warning Banner -->
      <div
        class="p-3 bg-amber-950/40 border border-amber-800/70 rounded-xl text-xs text-amber-200 flex items-start gap-2.5"
        data-testid="replacement-warning-banner"
      >
        <span class="text-amber-400 text-sm mt-0.5">⚠️</span>
        <div>
          <span class="font-semibold text-amber-300">Destructive Replacement:</span>
          The current download in qBittorrent and any partially downloaded files will be permanently purged.
          Request ID, metadata, and subscriber history will be preserved.
        </div>
      </div>

      <!-- Tab Switch (Airgap: only manual for private requests) -->
      <div
        v-if="!isPrivate"
        class="flex gap-2 border-b border-zinc-800 pb-2"
      >
        <button
          type="button"
          data-testid="tab-prowlarr"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
          :class="activeTab === 'prowlarr' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'"
          @click="activeTab = 'prowlarr'"
        >
          Prowlarr Search
        </button>
        <button
          type="button"
          data-testid="tab-manual"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition"
          :class="activeTab === 'manual' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'"
          @click="activeTab = 'manual'"
        >
          Manual Magnet / File
        </button>
      </div>
      <div
        v-else
        class="text-xs text-emerald-400 font-medium bg-emerald-950/30 border border-emerald-800/50 p-2 rounded-lg"
      >
        🔒 Private Tracker Request: Airgap active. External indexers disabled; provide manual magnet or .torrent file.
      </div>

      <!-- Error Alert -->
      <div
        v-if="errorMessage"
        data-testid="replacement-error-banner"
        class="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center justify-between gap-2"
      >
        <span>{{ errorMessage }}</span>
        <button
          type="button"
          class="text-red-400 hover:text-red-200 underline text-xs"
          @click="errorMessage = null"
        >
          Dismiss
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto space-y-3 min-h-[180px] max-h-[350px] pr-1">
        <!-- Prowlarr Tab -->
        <div
          v-if="!isPrivate && activeTab === 'prowlarr'"
          class="space-y-3"
        >
          <div
            v-if="isSearching"
            class="p-8 text-center space-y-2"
          >
            <div class="inline-block animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
            <p class="text-xs text-zinc-400">
              Searching indexers for {{ item.title }}...
            </p>
          </div>

          <div
            v-else-if="searchFailedMessage"
            class="p-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-800 rounded-xl"
          >
            <p class="text-amber-400 font-medium mb-1">
              Indexers Unavailable
            </p>
            <p>{{ searchFailedMessage }}</p>
            <button
              type="button"
              class="mt-3 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-lg text-zinc-200"
              @click="fetchReleases"
            >
              Retry Search
            </button>
          </div>

          <div
            v-else-if="candidates.length === 0"
            class="p-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-800 rounded-xl"
          >
            No releases found. Please use the Manual tab to provide a torrent.
          </div>

          <div
            v-else
            class="space-y-2"
          >
            <TorrentCandidateCard
              v-for="candidate in candidates"
              :key="candidate.guid"
              :candidate="candidate"
              :selected="selectedCandidate?.guid === candidate.guid"
              @select="selectedCandidate = candidate"
            />
          </div>
        </div>

        <!-- Manual Tab -->
        <TorrentManualInput
          v-else
          :magnet="manualMagnet"
          :file-base64="manualFileBase64"
          :file-name="manualFileName"
          @update:magnet="manualMagnet = $event"
          @file-selected="handleFileSelected"
          @clear-file="clearFile"
        />
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
        <button
          type="button"
          data-testid="cancel-replace-btn"
          class="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
          :disabled="isSubmitting"
          @click="handleClose"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="confirm-replace-btn"
          class="px-5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
          :class="canSubmit ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'"
          :disabled="!canSubmit || isSubmitting"
          @click="handleConfirmReplace"
        >
          <span
            v-if="isSubmitting"
            class="inline-block animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"
          />
          <span>{{ isSubmitting ? 'Replacing...' : 'Replace Torrent' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { api, ApiError } from '../lib/api';
import { useRequestsStore, type DownloadRequest } from '../stores/requests';
import type { ReleaseCandidate } from '../lib/releaseExplorer';
import TorrentCandidateCard from './TorrentCandidateCard.vue';
import TorrentManualInput from './TorrentManualInput.vue';

const props = defineProps<{
  open: boolean;
  item: DownloadRequest | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'replaced', request: DownloadRequest): void;
}>();

const requestsStore = useRequestsStore();

const activeTab = ref<'prowlarr' | 'manual'>('prowlarr');
const isSearching = ref(false);
const searchFailedMessage = ref<string | null>(null);
const candidates = ref<ReleaseCandidate[]>([]);
const selectedCandidate = ref<ReleaseCandidate | null>(null);

const manualMagnet = ref('');
const manualFileBase64 = ref<string | null>(null);
const manualFileName = ref<string | null>(null);

const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

const isPrivate = computed(() => props.item?.mediaType === 'private');

const subtitleText = computed(() => {
  if (!props.item) return '';
  let text = props.item.title;
  if (props.item.year) text += ` (${props.item.year})`;
  if (props.item.seasonNumber != null) {
    text += ` S${String(props.item.seasonNumber).padStart(2, '0')}`;
    if (props.item.episodeNumber != null) {
      text += `E${String(props.item.episodeNumber).padStart(2, '0')}`;
    }
  }
  return text;
});

const canSubmit = computed(() => {
  if (isSubmitting.value) return false;
  if (!isPrivate.value && activeTab.value === 'prowlarr') {
    return selectedCandidate.value !== null;
  }
  return manualMagnet.value.trim().length > 0 || manualFileBase64.value !== null;
});

async function fetchReleases(): Promise<void> {
  if (!props.item || isPrivate.value) return;
  isSearching.value = true;
  searchFailedMessage.value = null;
  selectedCandidate.value = null;

  try {
    const res = await api.post<{
      isConfigured: boolean;
      isReachable: boolean;
      candidates?: ReleaseCandidate[];
      releases?: ReleaseCandidate[];
      recommended?: ReleaseCandidate | null;
    }>('/requests/search-releases', {
      metadataId: props.item.metadataId,
      metadataSource: props.item.metadataSource,
      mediaType: props.item.mediaType,
      title: props.item.title,
      year: props.item.year ?? undefined,
      seasonNumber: props.item.seasonNumber ?? undefined,
      episodeNumber: props.item.episodeNumber ?? undefined,
    });
    candidates.value = res.candidates || res.releases || [];
    if (res.recommended && !selectedCandidate.value) {
      selectedCandidate.value = res.recommended;
    }
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      searchFailedMessage.value = err.message;
    } else {
      searchFailedMessage.value = (err as Error)?.message || 'Failed to fetch indexer releases.';
    }
  } finally {
    isSearching.value = false;
  }
}

function handleFileSelected(file: File): void {
  manualFileName.value = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as string;
    const base64 = result.includes(',') ? result.split(',')[1] : result;
    manualFileBase64.value = base64;
  };
  reader.readAsDataURL(file);
}

function clearFile(): void {
  manualFileBase64.value = null;
  manualFileName.value = null;
}

function handleClose(): void {
  if (isSubmitting.value) return;
  errorMessage.value = null;
  emit('close');
}

async function handleConfirmReplace(): Promise<void> {
  if (!props.item || !canSubmit.value) return;
  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const payload: { magnetLink?: string; torrentFileBase64?: string; torrentFileName?: string } = {};

    if (!isPrivate.value && activeTab.value === 'prowlarr' && selectedCandidate.value) {
      payload.magnetLink = selectedCandidate.value.downloadUrl;
    } else if (manualFileBase64.value) {
      payload.torrentFileBase64 = manualFileBase64.value;
      payload.torrentFileName = manualFileName.value || 'torrent.torrent';
    } else if (manualMagnet.value.trim()) {
      payload.magnetLink = manualMagnet.value.trim();
    }

    const updated = await requestsStore.replaceTorrent(props.item.id, payload);
    requestsStore.showToast('Torrent replaced successfully', 'success');
    emit('replaced', updated);
    emit('close');
  } catch (err: unknown) {
    errorMessage.value = (err as Error)?.message || 'Failed to replace torrent';
  } finally {
    isSubmitting.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.item) {
      errorMessage.value = null;
      manualMagnet.value = '';
      clearFile();
      if (isPrivate.value) {
        activeTab.value = 'manual';
      } else {
        activeTab.value = 'prowlarr';
        fetchReleases();
      }
    }
  },
  { immediate: true }
);
</script>
