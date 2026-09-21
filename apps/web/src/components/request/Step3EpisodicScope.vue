<template>
  <div
    v-if="['tv_show', 'anime'].includes(mediaType)"
    class="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-4"
  >
    <div class="flex items-center justify-between">
      <label class="text-xs font-semibold text-zinc-300">
        Download Scope
      </label>
      <span class="text-[11px] text-zinc-500">
        Choose whether to fetch the full season or a single episode
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        class="py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
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
        class="py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
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
          for="step3SeasonNumber"
          class="block text-xs font-medium text-zinc-400 mb-1"
        >
          Season Number
        </label>
        <input
          id="step3SeasonNumber"
          :value="seasonNumber"
          type="number"
          min="1"
          placeholder="1"
          class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          @input="$emit('update:seasonNumber', ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : null)"
          @change="$emit('seasonOrEpisodeChange')"
        >
      </div>

      <div v-if="downloadGranularity === 'episode'">
        <label
          for="step3EpisodeNumber"
          class="block text-xs font-medium text-zinc-400 mb-1"
        >
          Episode Number
        </label>
        <input
          id="step3EpisodeNumber"
          :value="episodeNumber"
          type="number"
          min="1"
          placeholder="1"
          class="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          @input="$emit('update:episodeNumber', ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : null)"
          @change="$emit('seasonOrEpisodeChange')"
        >
      </div>
    </div>

    <p class="text-xs text-zinc-500">
      {{ downloadGranularity === 'season'
        ? 'Downloads the entire season pack (default capped at 25 GB).'
        : 'Downloads a single specific episode (default capped at 2 GB).' }}
    </p>

    <!-- Waitlist Next Season Checkbox (Ticket 03) -->
    <div
      v-if="downloadGranularity === 'season'"
      class="pt-3 border-t border-zinc-800/80"
    >
      <label
        for="waitlistNextSeasonCheckbox"
        class="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-zinc-300 select-none hover:text-white transition"
      >
        <input
          id="waitlistNextSeasonCheckbox"
          :checked="waitlistNextSeason"
          type="checkbox"
          data-testid="waitlist-next-season-checkbox"
          class="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
          @change="$emit('update:waitlistNextSeason', ($event.target as HTMLInputElement).checked)"
        />
        <span>Auto-download next season when available</span>
      </label>
      <p class="text-[11px] text-zinc-400 ml-6.5 mt-0.5">
        Automatically monitors trackers and downloads Season {{ (seasonNumber || 1) + 1 }} when released.
      </p>
    </div>

    <!-- Watch for next episodes checkbox (Ticket 04 / Issue #70) -->
    <div
      v-if="downloadGranularity === 'episode'"
      class="pt-3 border-t border-zinc-800/80 space-y-2"
    >
      <label
        for="watchForNextEpisodesCheckbox"
        class="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-zinc-300 select-none hover:text-white transition"
      >
        <input
          id="watchForNextEpisodesCheckbox"
          :checked="watchForNextEpisodes"
          type="checkbox"
          data-testid="watch-for-next-episodes-checkbox"
          class="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
          @change="$emit('update:watchForNextEpisodes', ($event.target as HTMLInputElement).checked)"
        />
        <span>Watch for next episodes</span>
      </label>
      <p class="text-[11px] text-zinc-400 ml-6.5 mt-0.5">
        Automatically monitors trackers and downloads subsequent episodes as they become available.
      </p>

      <!-- Sub-checkbox: Notify before each auto-download -->
      <div
        v-if="watchForNextEpisodes"
        class="ml-6.5 pt-1.5"
      >
        <label
          for="notifyBeforeEachDownloadCheckbox"
          class="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-zinc-300 select-none hover:text-white transition"
        >
          <input
            id="notifyBeforeEachDownloadCheckbox"
            :checked="notifyBeforeEachDownload"
            type="checkbox"
            data-testid="notify-before-each-download-checkbox"
            class="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
            @change="$emit('update:notifyBeforeEachDownload', ($event.target as HTMLInputElement).checked)"
          />
          <span>Notify me before each auto-download</span>
        </label>
        <p class="text-[11px] text-zinc-400 ml-6.5 mt-0.5">
          Sends a Discord notification with a grace window before downloading each episode.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MediaType } from '../../stores/requests';

defineProps<{
  mediaType: MediaType;
  downloadGranularity: 'season' | 'episode';
  seasonNumber: number | null;
  episodeNumber: number | null;
  waitlistNextSeason: boolean;
  watchForNextEpisodes: boolean;
  notifyBeforeEachDownload: boolean;
}>();

defineEmits<{
  (e: 'granularityChange', val: 'season' | 'episode'): void;
  (e: 'seasonOrEpisodeChange'): void;
  (e: 'update:seasonNumber', val: number | null): void;
  (e: 'update:episodeNumber', val: number | null): void;
  (e: 'update:waitlistNextSeason', val: boolean): void;
  (e: 'update:watchForNextEpisodes', val: boolean): void;
  (e: 'update:notifyBeforeEachDownload', val: boolean): void;
}>();
</script>
