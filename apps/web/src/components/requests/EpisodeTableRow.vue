<template>
  <tr
    :data-testid="`episode-row-${ep.id}`"
    class="hover:bg-zinc-800/30 transition"
    :class="{ 'opacity-60': ep.status === 'pruned' }"
  >
    <!-- Episode Code -->
    <td class="py-2.5 px-3 font-mono font-medium text-white whitespace-nowrap">
      <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700/60">
        S{{ pad(ep.seasonNumber) }}E{{ pad(ep.episodeNumber) }}
      </span>
    </td>

    <!-- File Name / Relative Path -->
    <td
      class="py-2.5 px-3 max-w-[220px] truncate"
      :title="ep.relativePath"
    >
      {{ formatEpisodeName(ep.relativePath) }}
    </td>

    <!-- Size -->
    <td class="py-2.5 px-3 text-zinc-400 whitespace-nowrap font-mono">
      {{ formatBytes(ep.sizeBytes) }}
    </td>

    <!-- Play History -->
    <td class="py-2.5 px-3 whitespace-nowrap">
      <span
        v-if="ep.lastPlayedAt"
        class="inline-flex items-center gap-1 text-emerald-400 font-medium"
      >
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <span>Watched {{ formatDate(ep.lastPlayedAt) }}</span>
      </span>
      <span
        v-else
        class="text-zinc-500"
      >
        Unwatched
      </span>
    </td>

    <!-- Status Badge -->
    <td class="py-2.5 px-3 text-center whitespace-nowrap">
      <span
        v-if="ep.status === 'pruned'"
        class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700/60"
      >
        Pruned
      </span>
      <span
        v-else
        class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/80"
      >
        Downloaded
      </span>
    </td>

    <!-- Keep Toggle -->
    <td class="py-2.5 px-3 text-center whitespace-nowrap">
      <button
        type="button"
        :data-testid="`toggle-keep-ep-${ep.id}`"
        :disabled="!canManage || ep.status === 'pruned' || isTogglingKeep"
        class="p-1 rounded-md border transition cursor-pointer disabled:opacity-40"
        :class="ep.keepFlag
          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'"
        :title="ep.keepFlag ? 'Episode protected from cleanup' : 'Mark episode Keep to protect from pruning'"
        @click="$emit('toggleKeep', ep)"
      >
        <svg
          class="w-3.5 h-3.5"
          :fill="ep.keepFlag ? 'currentColor' : 'none'"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>
    </td>

    <!-- Actions (Prune) -->
    <td class="py-2.5 px-3 text-right whitespace-nowrap">
      <button
        v-if="ep.status !== 'pruned'"
        type="button"
        :data-testid="`prune-ep-${ep.id}`"
        :disabled="!canManage || isPruning"
        class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-400 bg-red-950/30 hover:bg-red-950/60 border border-red-800/50 rounded-md transition cursor-pointer disabled:opacity-40"
        title="Prune Episode (remove files and set priority 0)"
        @click="$emit('promptPrune', ep)"
      >
        <svg
          class="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span>Prune</span>
      </button>
      <span
        v-else
        class="text-[11px] text-zinc-500 italic"
      >
        Pruned
      </span>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { formatBytes, formatDate } from '../../lib/formatters';
import type { RequestEpisode } from './SeasonPackEpisodesDrawer.vue';

defineProps<{
  ep: RequestEpisode;
  canManage: boolean;
  isTogglingKeep: boolean;
  isPruning: boolean;
}>();

defineEmits<{
  (e: 'toggleKeep', ep: RequestEpisode): void;
  (e: 'promptPrune', ep: RequestEpisode): void;
}>();

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatEpisodeName(relPath: string): string {
  const parts = relPath.split(/[/\\]/);
  return parts[parts.length - 1] || relPath;
}
</script>
