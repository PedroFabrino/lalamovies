<template>
  <div class="space-y-4 flex-1 overflow-y-auto pr-1">
    <!-- Search Form -->
    <form
      class="space-y-3"
      @submit.prevent="$emit('submit-search')"
    >
      <div class="flex gap-2">
        <input
          id="searchWaitlistQuery"
          :value="searchQuery"
          type="text"
          placeholder="Search movie or TV show title..."
          data-testid="search-waitlist-input"
          class="flex-1 px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        >
        <button
          type="submit"
          :disabled="isSearching || !searchQuery.trim()"
          data-testid="search-waitlist-submit"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <svg
            v-if="isSearching"
            class="animate-spin h-4 w-4 text-white"
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
          <span v-else>Search</span>
        </button>
      </div>

      <!-- Media Type Selector -->
      <div class="flex gap-2">
        <label
          v-for="type in mediaTypeOptions"
          :key="type.value"
          class="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition"
          :class="searchMediaType === type.value
            ? 'bg-indigo-600/20 border-indigo-500 text-white'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'"
        >
          <input
            type="radio"
            name="modalMediaType"
            :value="type.value"
            :checked="searchMediaType === type.value"
            class="sr-only"
            @change="$emit('update:searchMediaType', type.value)"
          >
          <span>{{ type.icon }}</span>
          <span>{{ type.label }}</span>
        </label>
      </div>
    </form>

    <!-- Candidate Results -->
    <div
      v-if="candidates.length > 0"
      class="space-y-2 mt-4"
      data-testid="search-candidates-list"
    >
      <h4 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Results
      </h4>
      <div
        v-for="candidate in candidates"
        :key="candidate.id"
        data-testid="search-candidate-item"
        class="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-900/80 transition cursor-pointer flex gap-3 items-center group"
        @click="$emit('select', candidate)"
      >
        <div class="w-10 h-14 bg-zinc-900 rounded overflow-hidden shrink-0 border border-zinc-800 flex items-center justify-center">
          <img
            v-if="candidate.posterUrl"
            :src="candidate.posterUrl"
            :alt="candidate.title"
            class="w-full h-full object-cover"
            loading="lazy"
          >
          <span
            v-else
            class="text-sm text-zinc-600"
          >🎬</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h5 class="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition">
              {{ candidate.title }}
            </h5>
            <span
              v-if="candidate.year"
              class="text-xs text-zinc-400 shrink-0"
            >({{ candidate.year }})</span>
            <WaitlistBadge v-if="isItemWaitlisted({ id: candidate.id, title: candidate.title, mediaType: searchMediaType })" />
          </div>
          <p
            v-if="candidate.overview"
            class="text-xs text-zinc-400 line-clamp-1 mt-0.5"
          >
            {{ candidate.overview }}
          </p>
        </div>
        <svg
          class="w-4 h-4 text-zinc-500 group-hover:text-white transition shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
    <div
      v-else-if="hasSearched && !isSearching"
      class="py-8 text-center text-xs text-zinc-500"
    >
      No matches found on TMDB for "{{ searchQuery }}".
    </div>
  </div>
</template>

<script setup lang="ts">
import WaitlistBadge from '../WaitlistBadge.vue';
import type { WaitlistCandidate, MediaTypeOption } from './waitlistModalTypes';

defineProps<{
  searchQuery: string;
  searchMediaType: 'movie' | 'tv_show' | 'anime';
  mediaTypeOptions: MediaTypeOption[];
  isSearching: boolean;
  hasSearched: boolean;
  candidates: WaitlistCandidate[];
  isItemWaitlisted: (item: { id: string | number; title: string; mediaType: string }) => boolean;
}>();

defineEmits<{
  (e: 'submit-search'): void;
  (e: 'select', candidate: WaitlistCandidate): void;
  (e: 'update:searchQuery', val: string): void;
  (e: 'update:searchMediaType', val: 'movie' | 'tv_show' | 'anime'): void;
}>();
</script>
