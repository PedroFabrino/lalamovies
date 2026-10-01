<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    data-testid="create-watch-party-modal"
  >
    <div
      class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🎉</span>
          <h3 class="text-lg font-bold text-white tracking-tight">
            Host a Watch Party
          </h3>
        </div>
        <button
          type="button"
          class="text-zinc-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Media Preview -->
      <div class="flex items-center gap-4 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
        <img
          v-if="item?.posterUrl"
          :src="item.posterUrl"
          :alt="item.title"
          class="w-14 h-20 object-cover rounded-lg shrink-0 border border-zinc-800"
        >
        <div
          v-else
          class="w-14 h-20 bg-zinc-850 rounded-lg flex items-center justify-center text-zinc-600 shrink-0"
        >
          🎬
        </div>
        <div class="min-w-0 flex-1">
          <h4 class="font-bold text-sm text-white truncate">
            {{ item?.title }}
          </h4>
          <p class="text-xs text-zinc-400 mt-0.5">
            <span v-if="item?.year">{{ item.year }} • </span>
            <span class="capitalize">{{ item?.mediaType?.replace('_', ' ') }}</span>
            <span v-if="item?.seasonNumber && item?.episodeNumber">
              • S{{ String(item.seasonNumber).padStart(2, '0') }}E{{ String(item.episodeNumber).padStart(2, '0') }}
            </span>
          </p>
        </div>
      </div>

      <!-- Control Mode Selection -->
      <div class="space-y-2">
        <label class="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Playback Control Policy
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="flex flex-col items-center p-3 rounded-xl border transition text-center cursor-pointer"
            :class="controlMode === 'everyone'
              ? 'bg-purple-950/40 border-purple-500 text-purple-200'
              : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'"
            @click="controlMode = 'everyone'"
          >
            <span class="text-lg mb-1">👥</span>
            <span class="text-xs font-bold">Democratic</span>
            <span class="text-[10px] text-zinc-400 mt-0.5">Everyone controls</span>
          </button>

          <button
            type="button"
            class="flex flex-col items-center p-3 rounded-xl border transition text-center cursor-pointer"
            :class="controlMode === 'host_only'
              ? 'bg-purple-950/40 border-purple-500 text-purple-200'
              : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'"
            @click="controlMode = 'host_only'"
          >
            <span class="text-lg mb-1">👑</span>
            <span class="text-xs font-bold">Host Only</span>
            <span class="text-[10px] text-zinc-400 mt-0.5">Only host manages</span>
          </button>
        </div>
      </div>

      <!-- Error message -->
      <p
        v-if="errorMessage"
        class="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/60"
      >
        {{ errorMessage }}
      </p>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="px-4 py-2 text-sm text-zinc-400 hover:text-white transition cursor-pointer"
          :disabled="submitting"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-5 py-2 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-600/20"
          :disabled="submitting"
          @click="handleCreate"
        >
          <span
            v-if="submitting"
            class="animate-spin text-xs"
          >🌀</span>
          <span>Launch Party</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../lib/api';
import type { WatchParty } from './ActiveWatchPartiesShelf.vue';

export interface WatchPartyMediaItem {
  jellyfinItemId: string;
  title: string;
  mediaType: string;
  metadataId?: string;
  year?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  posterUrl?: string;
}

const props = defineProps<{
  open: boolean;
  item: WatchPartyMediaItem | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', party: WatchParty): void;
}>();

const controlMode = ref<'everyone' | 'host_only'>('everyone');
const submitting = ref(false);
const errorMessage = ref<string | null>(null);

async function handleCreate() {
  if (!props.item) return;
  submitting.value = true;
  errorMessage.value = null;

  try {
    const res = await api.post<{ watchParty: WatchParty }>('/watch-parties', {
      jellyfinItemId: props.item.jellyfinItemId,
      title: props.item.title,
      mediaType: props.item.mediaType,
      metadataId: props.item.metadataId,
      year: props.item.year,
      seasonNumber: props.item.seasonNumber,
      episodeNumber: props.item.episodeNumber,
      posterUrl: props.item.posterUrl,
      controlMode: controlMode.value,
    });

    emit('created', res.watchParty);
    emit('close');
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to create watch party';
  } finally {
    submitting.value = false;
  }
}
</script>
