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

      <!-- In-Modal Re-Authentication Prompt (#216) -->
      <div
        v-if="needsReauth"
        class="bg-purple-950/40 border border-purple-800/80 rounded-xl p-3.5 space-y-2.5 animate-in fade-in"
        data-testid="reauth-prompt"
      >
        <div class="flex items-center gap-2 text-xs font-bold text-purple-200">
          <span>🔐</span>
          <span>Jellyfin Re-Authentication Required</span>
        </div>
        <p class="text-[11px] text-zinc-300 leading-relaxed">
          Hosting a SyncPlay party requires active media server credentials. Enter your Jellyfin password to authorize without logging out:
        </p>
        <div class="flex gap-2">
          <input
            v-model="reauthPassword"
            type="password"
            placeholder="Jellyfin password"
            class="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            data-testid="reauth-password-input"
            :disabled="reauthSubmitting"
            @keyup.enter="handleReauth"
          >
          <button
            type="button"
            class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition cursor-pointer"
            data-testid="reauth-submit-btn"
            :disabled="!reauthPassword || reauthSubmitting"
            @click="handleReauth"
          >
            <span>{{ reauthSubmitting ? 'Verifying...' : 'Authorize' }}</span>
          </button>
        </div>
      </div>

      <!-- Error message -->
      <p
        v-if="errorMessage"
        class="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/60"
        data-testid="create-party-error"
      >
        {{ errorMessage }}
      </p>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="px-4 py-2 text-sm text-zinc-400 hover:text-white transition cursor-pointer"
          :disabled="submitting || reauthSubmitting"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-5 py-2 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-600/20"
          :disabled="submitting || reauthSubmitting"
          data-testid="launch-party-submit-btn"
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
import { useCreateWatchParty, type WatchPartyMediaItem } from '../composables/useCreateWatchParty';
import type { WatchParty } from './ActiveWatchPartiesShelf.vue';

const props = defineProps<{
  open: boolean;
  item: WatchPartyMediaItem | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', party: WatchParty): void;
}>();

const {
  controlMode,
  submitting,
  errorMessage,
  isManualEntry,
  selectedItemId,
  manualTitle,
  manualItemId,
  manualMediaType,
  availableOptions,
  needsReauth,
  reauthPassword,
  reauthSubmitting,
  handleCreate,
  handleReauth,
} = useCreateWatchParty(props, emit);

export type { WatchPartyMediaItem };
</script>
