<template>
  <div
    v-if="episode"
    data-testid="confirm-prune-modal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
  >
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-white">
            Prune Episode S{{ pad(episode.seasonNumber) }}E{{ pad(episode.episodeNumber) }}?
          </h3>
          <p class="text-xs text-zinc-400 mt-0.5">
            This will set priority to 0 in qBittorrent and delete both hardlinked files. Unwatched episodes continue seeding.
          </p>
        </div>
      </div>

      <div class="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-xs space-y-1 font-mono text-zinc-400">
        <div><span class="text-zinc-500">File:</span> {{ episode.relativePath }}</div>
        <div><span class="text-zinc-500">Reclaimed Space:</span> {{ formatBytes(episode.sizeBytes) }}</div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          data-testid="cancel-prune-btn"
          class="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition cursor-pointer"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="execute-prune-btn"
          :disabled="isPruning"
          class="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition cursor-pointer disabled:opacity-50"
          @click="$emit('confirm', episode)"
        >
          {{ isPruning ? 'Pruning...' : 'Confirm Prune' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatBytes } from '../../lib/formatters';
import type { RequestEpisode } from './SeasonPackEpisodesDrawer.vue';

defineProps<{
  episode: RequestEpisode | null;
  isPruning: boolean;
}>();

defineEmits<{
  (e: 'cancel'): void;
  (e: 'confirm', episode: RequestEpisode): void;
}>();

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
</script>
