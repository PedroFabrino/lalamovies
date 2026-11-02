<template>
  <div>
    <!-- Category Segmented Tabs & Filters -->
    <div class="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-6">
      <div class="flex items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800">
        <button
          type="button"
          data-testid="tab-movies"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition cursor-pointer"
          :class="activeCategory === 'movies' ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
          @click="$emit('update:activeCategory', 'movies')"
        >
          <span>Movies</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="activeCategory === 'movies' ? 'bg-violet-700/80 text-white' : 'bg-zinc-800 text-zinc-400'"
          >
            {{ moviesCount }}
          </span>
        </button>

        <button
          type="button"
          data-testid="tab-shows"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition cursor-pointer"
          :class="activeCategory === 'shows' ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
          @click="$emit('update:activeCategory', 'shows')"
        >
          <span>Series</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="activeCategory === 'shows' ? 'bg-violet-700/80 text-white' : 'bg-zinc-800 text-zinc-400'"
          >
            {{ showsCount }}
          </span>
        </button>

        <button
          type="button"
          data-testid="tab-anime"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition cursor-pointer"
          :class="activeCategory === 'anime' ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
          @click="$emit('update:activeCategory', 'anime')"
        >
          <span>Anime</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="activeCategory === 'anime' ? 'bg-violet-700/80 text-white' : 'bg-zinc-800 text-zinc-400'"
          >
            {{ animeCount }}
          </span>
        </button>
      </div>

      <!-- Filter & Search Controls -->
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <!-- Search Input -->
        <div class="relative flex-1 sm:w-64">
          <Search class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            :value="searchQuery"
            type="text"
            placeholder="Search library..."
            aria-label="Search library"
            class="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
            @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          >
        </div>

        <!-- My Downloads Only Toggle -->
        <label class="flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer bg-zinc-900/80 px-3.5 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800/60 transition select-none">
          <input
            :checked="myDownloadsOnly"
            type="checkbox"
            class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700 bg-zinc-800 cursor-pointer"
            @change="$emit('update:myDownloadsOnly', ($event.target as HTMLInputElement).checked)"
          >
          <span>My Downloads Only</span>
        </label>
      </div>
    </div>

    <!-- Genre & Attribute Chips Bar -->
    <div class="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
      <button
        v-for="chip in genreChips"
        :key="chip"
        type="button"
        class="px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer whitespace-nowrap"
        :class="selectedGenre === chip ? 'bg-violet-600/30 border-violet-500/80 text-violet-200' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
        @click="$emit('update:selectedGenre', chip)"
      >
        {{ chip }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next';

defineProps<{
  activeCategory: 'movies' | 'shows' | 'anime';
  moviesCount: number;
  showsCount: number;
  animeCount: number;
  searchQuery: string;
  myDownloadsOnly: boolean;
  selectedGenre: string;
  genreChips: string[];
}>();

defineEmits<{
  (e: 'update:activeCategory', cat: 'movies' | 'shows' | 'anime'): void;
  (e: 'update:searchQuery', val: string): void;
  (e: 'update:myDownloadsOnly', val: boolean): void;
  (e: 'update:selectedGenre', chip: string): void;
}>();
</script>
