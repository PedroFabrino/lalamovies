<template>
  <div
    v-if="selectedCandidate"
    class="bg-zinc-950/70 border border-zinc-800 rounded-xl p-5 flex gap-5"
  >
    <div class="w-24 h-36 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-700/50 flex items-center justify-center">
      <img
        v-if="selectedCandidate.posterUrl"
        :src="selectedCandidate.posterUrl"
        :alt="selectedCandidate.title"
        class="w-full h-full object-cover"
      >
      <div
        v-else
        class="text-zinc-600 text-xs text-center p-2"
      >
        No Poster
      </div>
    </div>

    <div class="flex-1">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
          {{ formatMediaType(mediaType) }}
        </span>
        <span class="text-xs text-zinc-400 uppercase font-mono">
          {{ selectedCandidate.source }} #{{ selectedCandidate.id }}
        </span>
      </div>

      <h3 class="text-xl font-bold text-white mb-1">
        {{ selectedCandidate.title }}
      </h3>

      <div class="text-xs text-zinc-400 mb-3">
        <span v-if="selectedCandidate.year">{{ selectedCandidate.year }}</span>
      </div>

      <p class="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
        {{ selectedCandidate.overview || 'No overview available.' }}
      </p>

      <!-- Anime title variant chips -->
      <div
        v-if="mediaType === 'anime' && (selectedCandidate.romajiTitle || selectedCandidate.englishTitle)"
        class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-800"
      >
        <span class="text-xs text-zinc-400 font-medium">Search Title:</span>
        <button
          v-if="selectedCandidate.romajiTitle || selectedCandidate.title"
          type="button"
          class="px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer"
          :class="activeAnimeTitle === (selectedCandidate.romajiTitle || selectedCandidate.title)
            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
            : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'"
          @click="$emit('setAnimeTitle', selectedCandidate.romajiTitle || selectedCandidate.title)"
        >
          {{ hasCjk(selectedCandidate.romajiTitle || selectedCandidate.title) ? 'Original' : 'Romaji' }}: {{ selectedCandidate.romajiTitle || selectedCandidate.title }}
        </button>
        <button
          v-if="selectedCandidate.englishTitle && selectedCandidate.englishTitle !== (selectedCandidate.romajiTitle || selectedCandidate.title)"
          type="button"
          class="px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer"
          :class="activeAnimeTitle === selectedCandidate.englishTitle
            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
            : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'"
          @click="$emit('setAnimeTitle', selectedCandidate.englishTitle)"
        >
          English: {{ selectedCandidate.englishTitle }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MediaType } from '../../stores/requests';
import type { MetadataCandidate } from '../../views/RequestView.vue';

defineProps<{
  selectedCandidate: MetadataCandidate | null;
  mediaType: MediaType;
  activeAnimeTitle: string | null;
  hasCjk: (s?: string | null) => boolean;
  formatMediaType: (t: MediaType) => string;
}>();

defineEmits<{
  (e: 'setAnimeTitle', title: string): void;
}>();
</script>
