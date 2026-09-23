<template>
  <div class="space-y-4" data-testid="tmdb-confirmation-flow">
    <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span>🔗</span> Confirm TMDB Waitlist Match
      </h3>
      <button
        type="button"
        class="text-xs text-zinc-400 hover:text-white"
        @click="$emit('back')"
      >
        ← Back
      </button>
    </div>

    <div v-if="isResolvingTmdb" class="py-8 text-center text-zinc-400 text-sm">
      <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      Matching with TMDB catalog...
    </div>

    <div v-else-if="tmdbCandidates.length === 0" class="py-6 text-center text-zinc-400 text-sm">
      <p>No exact TMDB match was found automatically.</p>
      <button
        type="button"
        class="mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
        @click="$emit('submit-direct')"
      >
        Submit with AniList Title
      </button>
    </div>

    <div v-else class="space-y-4">
      <!-- Matched Candidate Preview -->
      <div class="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-start gap-3.5">
        <img
          v-if="selectedCandidate?.posterUrl"
          :src="selectedCandidate.posterUrl"
          :alt="selectedCandidate.title"
          class="w-14 aspect-[2/3] object-cover rounded shadow flex-shrink-0"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-white truncate">{{ selectedCandidate?.title }}</span>
            <span v-if="selectedCandidate?.year" class="text-xs text-zinc-400">({{ selectedCandidate.year }})</span>
          </div>
          <p class="text-xs text-zinc-400 line-clamp-2 mt-1">
            {{ selectedCandidate?.overview || 'No overview available.' }}
          </p>
          <p class="text-[11px] text-zinc-500 mt-1">
            TMDB ID: <span class="font-mono text-zinc-300">{{ selectedCandidate?.id }}</span>
          </p>
        </div>
      </div>

      <!-- Candidate Switcher if Multiple -->
      <div v-if="tmdbCandidates.length > 1" class="text-xs">
        <label class="block text-zinc-400 mb-1">Alternate TMDB Candidate:</label>
        <select
          :value="selectedCandidateId"
          class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200"
          @change="$emit('update:selectedCandidateId', ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="cand in tmdbCandidates"
            :key="cand.id"
            :value="cand.id"
          >
            {{ cand.title }} ({{ cand.year || 'N/A' }}) — ID {{ cand.id }}
          </option>
        </select>
      </div>

      <!-- Waitlist Mode Selection -->
      <div class="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/80 space-y-2">
        <label class="block text-xs font-semibold text-zinc-300">Waitlist Download Mode:</label>
        <label class="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
          <input
            type="radio"
            name="waitlistModeRadio"
            value="episodic"
            :checked="waitlistMode === 'episodic'"
            class="text-indigo-600 focus:ring-indigo-500"
            @change="$emit('update:waitlistMode', 'episodic')"
          />
          <span>
            <strong>Weekly Episodic Tracking</strong>
            <span class="block text-[11px] text-zinc-400">Auto-advances and downloads each weekly episode as it airs</span>
          </span>
        </label>
        <label class="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
          <input
            type="radio"
            name="waitlistModeRadio"
            value="season_pack"
            :checked="waitlistMode === 'season_pack'"
            class="text-indigo-600 focus:ring-indigo-500"
            @change="$emit('update:waitlistMode', 'season_pack')"
          />
          <span>
            <strong>Complete Season Pack</strong>
            <span class="block text-[11px] text-zinc-400">Waits for the season to finish and grabs the full batch release</span>
          </span>
        </label>
      </div>

      <!-- Confirmation Action Buttons -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          :disabled="isSubmittingWaitlist"
          @click="$emit('back')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow"
          :disabled="isSubmittingWaitlist"
          @click="$emit('confirm')"
        >
          <span v-if="isSubmittingWaitlist" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>{{ isSubmittingWaitlist ? 'Adding...' : 'Confirm & Add to Waitlist' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface MetadataCandidate {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
}

const props = defineProps<{
  isResolvingTmdb: boolean;
  tmdbCandidates: MetadataCandidate[];
  selectedCandidateId: string;
  waitlistMode: 'episodic' | 'season_pack';
  isSubmittingWaitlist: boolean;
}>();

defineEmits<{
  (e: 'back'): void;
  (e: 'update:selectedCandidateId', id: string): void;
  (e: 'update:waitlistMode', mode: 'episodic' | 'season_pack'): void;
  (e: 'confirm'): void;
  (e: 'submit-direct'): void;
}>();

const selectedCandidate = computed(() => {
  return (
    props.tmdbCandidates.find((c) => c.id === props.selectedCandidateId) ||
    props.tmdbCandidates[0] ||
    null
  );
});
</script>
