<template>
  <div
    v-if="selectedCandidate"
    class="space-y-4 flex-1"
  >
    <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex gap-4 items-center">
      <div class="w-14 h-20 bg-zinc-900 rounded overflow-hidden shrink-0 border border-zinc-800 flex items-center justify-center">
        <img
          v-if="selectedCandidate.posterUrl"
          :src="selectedCandidate.posterUrl"
          :alt="selectedCandidate.title"
          class="w-full h-full object-cover"
        >
        <span
          v-else
          class="text-xl"
        >🎬</span>
      </div>
      <div class="flex-1 min-w-0">
        <h4
          class="text-base font-bold text-white truncate"
          data-testid="confirm-candidate-title"
        >
          {{ selectedCandidate.title }}
        </h4>
        <div class="flex items-center gap-2 text-xs text-zinc-400 mt-1">
          <span v-if="selectedCandidate.year">({{ selectedCandidate.year }})</span>
          <span>•</span>
          <span
            class="px-1.5 py-0.5 rounded text-[10px] font-medium border"
            :class="getMediaTypeBadgeClasses(selectedMediaType)"
          >
            {{ formatMediaType(selectedMediaType) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Guard: Already On Waitlist Alert -->
    <div
      v-if="isCandidateAlreadyWaitlisted"
      class="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-300 flex items-start gap-3"
      data-testid="already-on-waitlist-alert"
    >
      <span class="text-lg leading-none">⚠️</span>
      <div class="space-y-1">
        <div class="font-semibold text-amber-200">
          Already on your waitlist!
        </div>
        <p class="text-zinc-300">
          This {{ selectedMediaType === 'movie' ? 'movie' : 'series season' }} is already active on your waitlist. You cannot add it again.
        </p>
      </div>
    </div>

    <!-- Guard 1: Already In Library Alert -->
    <div
      v-if="libraryStatus?.inLibrary"
      class="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-300 flex items-start gap-3"
      data-testid="already-in-library-alert"
    >
      <span class="text-lg leading-none">⚠️</span>
      <div class="space-y-1">
        <div class="font-semibold text-amber-200">
          Already in your library!
        </div>
        <p class="text-zinc-300">
          This {{ selectedMediaType === 'movie' ? 'movie' : 'episode' }} is already downloaded or active in your download queue{{ libraryStatus.status ? ` (${libraryStatus.status})` : '' }}. You cannot add it to the waitlist.
        </p>
      </div>
    </div>

    <!-- Guard 2: Tracker Releases Available Alert -->
    <div
      v-if="availableReleasesCount > 0 && !libraryStatus?.inLibrary"
      class="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-start gap-3"
      data-testid="releases-available-alert"
    >
      <span class="text-lg leading-none">⚡</span>
      <div class="space-y-2 flex-1 min-w-0">
        <div>
          <span class="font-semibold text-emerald-200">
            Releases Available on Trackers!
          </span>
          <p class="text-zinc-300 mt-0.5">
            We found <span class="font-bold text-white">{{ availableReleasesCount }}</span> matching release{{ availableReleasesCount > 1 ? 's' : '' }} on trackers right now. You can download directly instead of waiting on the waitlist.
          </p>
        </div>
        <div class="pt-1">
          <button
            type="button"
            data-testid="download-directly-btn"
            class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
            @click="$emit('download-directly')"
          >
            <span>📥 Download Directly Now</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Season & Episode Selectors for TV Show / Anime -->
    <div
      v-if="['tv_show', 'anime'].includes(selectedMediaType)"
      class="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-4"
    >
      <!-- Progress badge if series has existing downloads -->
      <div
        v-if="seriesProgress?.hasExisting"
        class="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-lg text-xs text-indigo-300 flex items-start gap-2.5"
        data-testid="series-progress-badge"
      >
        <span class="text-base leading-none">💡</span>
        <div class="space-y-1">
          <div class="font-medium">
            In Library:
            <span class="text-white">
              Season {{ selectedSeasonNumber }}
              <template v-if="seriesProgress.existingEpisodes.length > 0">
                (Episode{{ seriesProgress.existingEpisodes.length > 1 ? 's ' : ' ' }}{{ seriesProgress.existingEpisodes.join(', ') }})
              </template>
              <template v-else>
                (No episodes in this season yet)
              </template>
            </span>
          </div>
          <div class="text-[11px] text-zinc-400">
            Auto-targeting next episode {{ selectedEpisodeNumber || 1 }}. You can adjust below if needed.
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label
            for="waitlistSeasonInput"
            class="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Target Season
          </label>
          <input
            id="waitlistSeasonInput"
            :value="selectedSeasonNumber"
            type="number"
            min="1"
            data-testid="waitlist-season-input"
            class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @input="$emit('update:selectedSeasonNumber', Number(($event.target as HTMLInputElement).value))"
            @change="$emit('change-guards')"
          >
        </div>

        <div>
          <label
            for="waitlistEpisodeInput"
            class="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Target Episode
          </label>
          <input
            id="waitlistEpisodeInput"
            :value="selectedEpisodeNumber"
            type="number"
            min="1"
            data-testid="waitlist-episode-input"
            class="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @input="$emit('update:selectedEpisodeNumber', Number(($event.target as HTMLInputElement).value))"
            @change="$emit('change-guards')"
          >
        </div>
      </div>

      <p class="text-[11px] text-zinc-400">
        Monitors S{{ (selectedSeasonNumber || 1) < 10 ? '0' + (selectedSeasonNumber || 1) : selectedSeasonNumber }}E{{ (selectedEpisodeNumber || 1) < 10 ? '0' + (selectedEpisodeNumber || 1) : selectedEpisodeNumber }} releases once available on trackers.
      </p>
    </div>

    <!-- TMDB Air Date / Release Date Display -->
    <div
      class="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs flex items-center justify-between"
      data-testid="confirm-air-date-info"
    >
      <span class="text-zinc-400">
        <template v-if="['tv_show', 'anime'].includes(selectedMediaType)">
          Episode Air Date:
        </template>
        <template v-else>
          TMDB Release Date:
        </template>
      </span>
      <span
        class="text-white font-medium flex items-center gap-1.5"
        data-testid="confirm-air-date-value"
      >
        <span>📅</span>
        <span v-if="targetAirDate">{{ formatDateOnly(targetAirDate) }}</span>
        <span v-else>Date TBA</span>
      </span>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center justify-between pt-4 border-t border-zinc-800">
      <button
        v-if="!isPrefilled"
        type="button"
        class="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
        @click="$emit('back')"
      >
        ← Back to search
      </button>
      <button
        v-else
        type="button"
        class="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
        @click="$emit('cancel')"
      >
        Cancel
      </button>

      <button
        type="button"
        data-testid="confirm-add-waitlist-btn"
        :disabled="isSubmitting || libraryStatus?.inLibrary || isCandidateAlreadyWaitlisted"
        class="px-5 py-2 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2"
        :class="libraryStatus?.inLibrary || isCandidateAlreadyWaitlisted ? 'opacity-50 cursor-not-allowed bg-zinc-700 hover:bg-zinc-700' : 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer disabled:opacity-50'"
        @click="$emit('confirm')"
      >
        <svg
          v-if="isSubmitting"
          class="animate-spin h-3.5 w-3.5 text-white"
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
        <span>{{ isSubmitting ? 'Adding...' : (isCandidateAlreadyWaitlisted ? 'Already on Waitlist' : (libraryStatus?.inLibrary ? 'Already in Library' : 'Confirm & Add to Waitlist')) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatMediaType } from '../../lib/formatters';
import { getMediaTypeBadgeClasses, formatDateOnly } from './waitlistCardUtils';
import type { WaitlistCandidate, SeriesProgressResponse } from './waitlistModalTypes';

defineProps<{
  selectedCandidate: WaitlistCandidate | null;
  selectedMediaType: 'movie' | 'tv_show' | 'anime';
  selectedSeasonNumber: number;
  selectedEpisodeNumber: number | null;
  targetAirDate: string | null;
  seriesProgress: SeriesProgressResponse | null;
  libraryStatus: { inLibrary: boolean; hasExisting: boolean; status?: string | null } | null;
  availableReleasesCount: number;
  isCandidateAlreadyWaitlisted: boolean;
  isSubmitting: boolean;
  isPrefilled: boolean;
}>();

defineEmits<{
  (e: 'back'): void;
  (e: 'cancel'): void;
  (e: 'confirm'): void;
  (e: 'download-directly'): void;
  (e: 'change-guards'): void;
  (e: 'update:selectedSeasonNumber', n: number): void;
  (e: 'update:selectedEpisodeNumber', n: number | null): void;
}>();
</script>
