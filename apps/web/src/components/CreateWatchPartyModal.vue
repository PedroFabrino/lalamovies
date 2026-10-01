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

      <!-- Pre-Selected Media Preview -->
      <div
        v-if="item"
        class="flex items-center gap-4 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80"
      >
        <img
          v-if="item.posterUrl"
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
            {{ item.title }}
          </h4>
          <p class="text-xs text-zinc-400 mt-0.5">
            <span v-if="item.year">{{ item.year }} • </span>
            <span class="capitalize">{{ item.mediaType?.replace('_', ' ') }}</span>
            <span v-if="item.seasonNumber && item.episodeNumber">
              • S{{ String(item.seasonNumber).padStart(2, '0') }}E{{ String(item.episodeNumber).padStart(2, '0') }}
            </span>
          </p>
        </div>
      </div>

      <!-- Generic Mode (Pick from Streams / Library or Manual) -->
      <div
        v-else
        class="space-y-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80"
      >
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Select Media
          </label>
          <button
            type="button"
            class="text-xs text-purple-400 hover:text-purple-300 transition cursor-pointer"
            data-testid="toggle-manual-entry"
            @click="isManualEntry = !isManualEntry"
          >
            {{ isManualEntry ? '← Choose from Media' : 'Enter Manually...' }}
          </button>
        </div>

        <!-- Dropdown Mode -->
        <div
          v-if="!isManualEntry"
          class="space-y-2"
        >
          <select
            v-model="selectedItemId"
            class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            data-testid="media-select"
          >
            <option
              value=""
              disabled
            >
              Select an active stream or library item...
            </option>
            <option
              v-for="opt in availableOptions"
              :key="opt.jellyfinItemId"
              :value="opt.jellyfinItemId"
            >
              {{ opt.label }}
            </option>
          </select>
          <p
            v-if="availableOptions.length === 0"
            class="text-[11px] text-zinc-500 italic"
          >
            No active streams or library items found. Click "Enter Manually" above.
          </p>
        </div>

        <!-- Manual Mode -->
        <div
          v-else
          class="space-y-2.5"
        >
          <div>
            <label class="text-[11px] text-zinc-400 block mb-1">Title</label>
            <input
              v-model="manualTitle"
              type="text"
              placeholder="e.g. Spirited Away"
              class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
              data-testid="manual-title-input"
            >
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] text-zinc-400 block mb-1">Jellyfin Item ID</label>
              <input
                v-model="manualItemId"
                type="text"
                placeholder="Item GUID"
                class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                data-testid="manual-item-id-input"
              >
            </div>
            <div>
              <label class="text-[11px] text-zinc-400 block mb-1">Media Type</label>
              <select
                v-model="manualMediaType"
                class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                data-testid="manual-media-type-select"
              >
                <option value="movie">
                  Movie
                </option>
                <option value="tv_show">
                  Series
                </option>
                <option value="anime">
                  Anime
                </option>
              </select>
            </div>
          </div>
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
import { ref, watch } from 'vue';
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

interface GenericOption {
  label: string;
  jellyfinItemId: string;
  title: string;
  mediaType: string;
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

const isManualEntry = ref(false);
const selectedItemId = ref('');
const manualTitle = ref('');
const manualItemId = ref('');
const manualMediaType = ref<'movie' | 'tv_show' | 'anime'>('movie');
const availableOptions = ref<GenericOption[]>([]);

async function loadGenericOptions() {
  if (props.item) return;
  try {
    const [streamsRes, requestsRes] = await Promise.all([
      api.get<{ streams?: Array<{ title: string; status: string; jellyfinItemId?: string }> }>('/streams').catch(() => ({ streams: [] })),
      api.get<{ requests?: Array<{ id?: string; title: string; status: string; mediaType?: string; jellyfinItemId?: string; jellyfinPath?: string }> }>('/requests').catch(() => ({ requests: [] })),
    ]);

    const opts: GenericOption[] = [];
    if (streamsRes?.streams) {
      for (const s of streamsRes.streams) {
        if (s.status === 'ready' && s.jellyfinItemId) {
          opts.push({
            label: `[Stream] ${s.title}`,
            jellyfinItemId: s.jellyfinItemId,
            title: s.title,
            mediaType: 'movie',
          });
        }
      }
    }
    if (requestsRes?.requests) {
      for (const r of requestsRes.requests) {
        if ((r.status === 'completed' || r.status === 'seeding') && r.title) {
          const fallbackId = r.jellyfinItemId || r.id;
          if (fallbackId) {
            opts.push({
              label: `[Library] ${r.title}`,
              jellyfinItemId: fallbackId,
              title: r.title,
              mediaType: r.mediaType || 'movie',
            });
          }
        }
      }
    }
    availableOptions.value = opts;
    if (opts.length > 0 && !selectedItemId.value) {
      selectedItemId.value = opts[0].jellyfinItemId;
    }
  } catch {
    availableOptions.value = [];
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && !props.item) {
      loadGenericOptions();
    }
  },
  { immediate: true }
);

async function handleCreate() {
  submitting.value = true;
  errorMessage.value = null;

  let payload: WatchPartyMediaItem | null = null;
  if (props.item) {
    payload = { ...props.item };
  } else if (isManualEntry.value) {
    if (!manualTitle.value.trim() || !manualItemId.value.trim()) {
      errorMessage.value = 'Please provide both Title and Jellyfin Item ID.';
      submitting.value = false;
      return;
    }
    payload = {
      title: manualTitle.value.trim(),
      jellyfinItemId: manualItemId.value.trim(),
      mediaType: manualMediaType.value,
    };
  } else {
    const found = availableOptions.value.find((o) => o.jellyfinItemId === selectedItemId.value);
    if (!found) {
      errorMessage.value = 'Please select a media item or enter one manually.';
      submitting.value = false;
      return;
    }
    payload = {
      title: found.title,
      jellyfinItemId: found.jellyfinItemId,
      mediaType: found.mediaType,
      posterUrl: found.posterUrl,
    };
  }

  try {
    const res = await api.post<{ watchParty: WatchParty }>('/watch-parties', {
      jellyfinItemId: payload.jellyfinItemId,
      title: payload.title,
      mediaType: payload.mediaType,
      metadataId: payload.metadataId,
      year: payload.year,
      seasonNumber: payload.seasonNumber,
      episodeNumber: payload.episodeNumber,
      posterUrl: payload.posterUrl,
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
