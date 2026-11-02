<template>
  <div
    class="space-y-4"
    data-testid="promotion-step-2"
  >
    <div class="space-y-2">
      <label class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
        Search & Match Title
      </label>
      <div class="flex gap-2">
        <input
          :value="searchQuery"
          type="text"
          class="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
          placeholder="Search TMDB / AniList..."
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          @keyup.enter="$emit('search')"
        >
        <button
          type="button"
          class="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
          :disabled="isSearching"
          @click="$emit('search')"
        >
          {{ isSearching ? 'Searching...' : 'Search' }}
        </button>
      </div>
    </div>

    <!-- Candidates List -->
    <div class="max-h-60 overflow-y-auto space-y-2 pr-1">
      <div
        v-for="c in candidates"
        :key="c.id"
        class="p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer"
        :class="selectedCandidate?.id === c.id ? 'bg-violet-600/20 border-violet-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'"
        @click="$emit('select', c)"
      >
        <img
          v-if="c.posterUrl"
          :src="c.posterUrl"
          alt="Poster"
          class="w-10 h-14 object-cover rounded-lg shrink-0 bg-zinc-800"
        >
        <div
          v-else
          class="w-10 h-14 bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-500 shrink-0"
        >
          🎬
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-xs text-white truncate">
            {{ c.title }}
          </div>
          <div class="text-[11px] text-zinc-400 mt-0.5">
            <span v-if="c.year">{{ c.year }} • </span>
            <span class="uppercase text-[10px] text-zinc-500">{{ c.source }}</span>
          </div>
          <p
            v-if="c.overview"
            class="text-[11px] text-zinc-500 line-clamp-1 mt-0.5"
          >
            {{ c.overview }}
          </p>
        </div>
        <div
          v-if="selectedCandidate?.id === c.id"
          class="text-violet-400 font-bold text-sm"
        >
          ✓
        </div>
      </div>

      <div
        v-if="candidates.length === 0 && !isSearching"
        class="text-center py-6 text-xs text-zinc-500"
      >
        No matching metadata found. You can adjust your query or use manual match below.
      </div>
    </div>

    <!-- Actions -->
    <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
      <button
        type="button"
        class="text-zinc-400 hover:text-white cursor-pointer"
        @click="$emit('back')"
      >
        &larr; Back
      </button>
      <button
        type="button"
        class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition cursor-pointer disabled:opacity-50 shadow-md shadow-violet-600/30"
        data-testid="button-step-2-next"
        :disabled="!selectedCandidate"
        @click="$emit('next')"
      >
        {{ mediaType === 'movie' ? 'Confirm & Promote' : 'Next &rarr;' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface PromotionCandidate {
  id: string;
  title: string;
  year?: number | null;
  source: 'tmdb' | 'anilist';
  posterUrl?: string | null;
  overview?: string | null;
}

defineProps<{
  searchQuery: string;
  candidates: PromotionCandidate[];
  selectedCandidate: PromotionCandidate | null;
  isSearching: boolean;
  mediaType: 'movie' | 'tv_show' | 'anime';
}>();

defineEmits<{
  (e: 'update:searchQuery', val: string): void;
  (e: 'search'): void;
  (e: 'select', candidate: PromotionCandidate): void;
  (e: 'back'): void;
  (e: 'next'): void;
}>();
</script>
