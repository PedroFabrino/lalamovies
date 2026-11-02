<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    data-testid="promotion-modal"
  >
    <div
      class="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6 text-zinc-100 animate-scale-in"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span>💾</span>
            <span>Promote Stream to Permanent Library</span>
          </h3>
          <p class="text-xs text-zinc-400 mt-0.5 truncate max-w-sm">
            {{ stream?.title }}
          </p>
        </div>
        <button
          type="button"
          class="text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-zinc-800 transition cursor-pointer"
          :disabled="isPromoting"
          @click="handleClose"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Success State -->
      <div
        v-if="promotedResult"
        class="space-y-4 py-4 text-center"
        data-testid="promotion-success"
      >
        <div class="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-3xl">
          <CheckCircle2 class="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h4 class="text-lg font-bold text-white">
            Promotion Complete!
          </h4>
          <p class="text-xs text-zinc-400 mt-1">
            Media downloaded directly via HTTP and imported into your permanent library.
          </p>
        </div>
        <button
          type="button"
          class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow transition cursor-pointer"
          @click="handleClose"
        >
          Done
        </button>
      </div>

      <!-- In-Progress Downloading State -->
      <div
        v-else-if="isPromoting"
        class="space-y-4 py-8 text-center"
        data-testid="promotion-in-progress"
      >
        <div class="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div class="absolute inset-0 rounded-full border-4 border-violet-500/20 animate-ping" />
          <div class="w-16 h-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
          <span class="absolute text-xl">⏳</span>
        </div>
        <div>
          <h4 class="text-base font-semibold text-white">
            Promoting Media
          </h4>
          <p class="text-xs text-zinc-400 mt-1">
            Downloading direct from cloud debrid and linking to permanent Jellyfin library...
          </p>
        </div>
        <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
          <div class="bg-violet-500 h-full w-2/3 animate-pulse rounded-full" />
        </div>
      </div>

      <!-- Steps Wizard -->
      <div
        v-else
        class="space-y-5"
      >
        <!-- Error Banner -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200"
        >
          {{ errorMessage }}
        </div>

        <!-- Step Indicator -->
        <div class="flex items-center justify-between text-xs text-zinc-400 px-2">
          <span :class="{ 'text-violet-400 font-semibold': step === 1 }">1. Media Type</span>
          <span>&rarr;</span>
          <span :class="{ 'text-violet-400 font-semibold': step === 2 }">2. Match Metadata</span>
          <span>&rarr;</span>
          <span :class="{ 'text-violet-400 font-semibold': step === 3 }">3. Season & Episode</span>
        </div>

        <!-- Step 1: Media Type Selection -->
        <div
          v-if="step === 1"
          class="space-y-4"
          data-testid="promotion-step-1"
        >
          <label class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Select Media Type
          </label>
          <div class="grid grid-cols-3 gap-3">
            <button
              type="button"
              class="p-4 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-2"
              :class="mediaType === 'movie' ? 'bg-violet-600/20 border-violet-500 text-violet-200' : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800 text-zinc-400'"
              @click="mediaType = 'movie'"
            >
              <Film class="w-6 h-6 text-violet-400" />
              <span class="text-xs font-semibold">Movie</span>
            </button>
            <button
              type="button"
              class="p-4 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-2"
              :class="mediaType === 'tv_show' ? 'bg-violet-600/20 border-violet-500 text-violet-200' : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800 text-zinc-400'"
              @click="mediaType = 'tv_show'"
            >
              <Tv class="w-6 h-6 text-violet-400" />
              <span class="text-xs font-semibold">TV Show</span>
            </button>
            <button
              type="button"
              class="p-4 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-2"
              :class="mediaType === 'anime' ? 'bg-violet-600/20 border-violet-500 text-violet-200' : 'bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800 text-zinc-400'"
              @click="mediaType = 'anime'"
            >
              <Sparkles class="w-6 h-6 text-violet-400" />
              <span class="text-xs font-semibold">Anime</span>
            </button>
          </div>

          <div class="flex justify-end pt-2">
            <button
              type="button"
              class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-xl transition cursor-pointer shadow-md shadow-violet-600/30"
              data-testid="button-step-1-next"
              @click="goToStep2"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        <!-- Step 2: Metadata Match Confirmation Sub-Component -->
        <PromotionStep2Metadata
          v-else-if="step === 2"
          :search-query="searchQuery"
          :candidates="candidates"
          :selected-candidate="selectedCandidate"
          :is-searching="isSearching"
          :media-type="mediaType"
          @update:search-query="searchQuery = $event"
          @search="searchMetadata"
          @select="selectedCandidate = $event"
          @back="step = 1"
          @next="handleStep2Next"
        />

        <!-- Step 3: Season & Episode Selection (TV / Anime) -->
        <div
          v-else-if="step === 3"
          class="space-y-4"
          data-testid="promotion-step-3"
        >
          <div class="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-3">
            <Tv class="w-5 h-5 text-violet-400" />
            <div>
              <div class="text-xs font-semibold text-white">
                {{ selectedCandidate?.title }}
              </div>
              <div class="text-[11px] text-zinc-400">
                Year: {{ selectedCandidate?.year || 'Unknown' }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Season Number
              </label>
              <input
                v-model.number="seasonNumber"
                type="number"
                min="1"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Episode Number (Optional)
              </label>
              <input
                v-model.number="episodeNumber"
                type="number"
                min="1"
                placeholder="All / Batch"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-zinc-800">
            <button
              type="button"
              class="text-xs text-zinc-400 hover:text-white cursor-pointer"
              @click="step = 2"
            >
              &larr; Back
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-xl transition cursor-pointer shadow-md shadow-violet-600/30"
              data-testid="button-step-3-confirm"
              @click="submitPromotion"
            >
              Confirm & Promote
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, Film, Tv, Sparkles, CheckCircle2 } from 'lucide-vue-next';
import { api } from '../lib/api';
import PromotionStep2Metadata, { type PromotionCandidate } from './promotion/PromotionStep2Metadata.vue';

export type { PromotionCandidate };

const props = defineProps<{
  show: boolean;
  stream: {
    id: string;
    title: string;
    magnetLink?: string;
  } | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'promoted', payload: { streamId: string; requestId: string }): void;
}>();

const step = ref<1 | 2 | 3>(1);
const mediaType = ref<'movie' | 'tv_show' | 'anime'>('movie');
const searchQuery = ref('');
const candidates = ref<PromotionCandidate[]>([]);
const selectedCandidate = ref<PromotionCandidate | null>(null);
const seasonNumber = ref<number>(1);
const episodeNumber = ref<number | undefined>(undefined);

const isSearching = ref(false);
const isPromoting = ref(false);
const errorMessage = ref('');
const promotedResult = ref<{ requestId: string; jellyfinPath?: string } | null>(null);

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      step.value = 1;
      mediaType.value = 'movie';
      searchQuery.value = props.stream?.title || '';
      candidates.value = [];
      selectedCandidate.value = null;
      seasonNumber.value = 1;
      episodeNumber.value = undefined;
      errorMessage.value = '';
      promotedResult.value = null;
      isPromoting.value = false;
    }
  }
);

function handleClose() {
  emit('close');
}

async function goToStep2() {
  step.value = 2;
  if (!searchQuery.value && props.stream?.title) {
    searchQuery.value = props.stream.title;
  }
  if (searchQuery.value && candidates.value.length === 0) {
    await searchMetadata();
  }
}

async function searchMetadata() {
  if (!searchQuery.value.trim()) return;
  isSearching.value = true;
  errorMessage.value = '';
  try {
    const res = await api.post<{ candidates: PromotionCandidate[] }>('/requests/search-metadata', {
      query: searchQuery.value.trim(),
      mediaType: mediaType.value,
    });
    candidates.value = res.candidates || [];
    if (candidates.value.length > 0) {
      selectedCandidate.value = candidates.value[0];
    }
  } catch (err: unknown) {
    errorMessage.value = (err as Error).message || 'Failed to search metadata';
  } finally {
    isSearching.value = false;
  }
}

function handleStep2Next() {
  if (!selectedCandidate.value) return;
  if (mediaType.value === 'movie') {
    submitPromotion();
  } else {
    step.value = 3;
  }
}

async function submitPromotion() {
  if (!props.stream?.id || !selectedCandidate.value) return;

  isPromoting.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      mediaType: mediaType.value,
      metadataId: selectedCandidate.value.id,
      metadataSource: selectedCandidate.value.source,
      title: selectedCandidate.value.title,
      year: selectedCandidate.value.year || undefined,
      seasonNumber: mediaType.value !== 'movie' ? seasonNumber.value : undefined,
      episodeNumber: mediaType.value !== 'movie' && episodeNumber.value ? episodeNumber.value : undefined,
    };

    const res = await api.post<{
      status: string;
      streamId: string;
      requestId: string;
      jellyfinPath?: string;
    }>(`/streams/${props.stream.id}/promote`, payload);

    promotedResult.value = {
      requestId: res.requestId,
      jellyfinPath: res.jellyfinPath,
    };

    emit('promoted', {
      streamId: props.stream.id,
      requestId: res.requestId,
    });
  } catch (err: unknown) {
    errorMessage.value = (err as Error).message || 'Failed to promote stream';
  } finally {
    isPromoting.value = false;
  }
}
</script>
