<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-white">
          Select Metadata Match
        </h2>
        <p class="text-xs text-zinc-400 mt-0.5">
          Choose the correct match for your media to ensure proper naming in Jellyfin.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="mediaType === 'private'"
          type="button"
          class="px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-950/40 border border-amber-800/60 rounded-lg hover:bg-amber-900/50 transition cursor-pointer flex items-center gap-1.5"
          @click="$emit('skipMetadata')"
        >
          <span>Skip Metadata</span>
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          @click="$emit('back')"
        >
          Back to Step 1
        </button>
      </div>
    </div>

    <!-- In-Place Search Bar -->
    <form
      class="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3"
      @submit.prevent="$emit('search')"
    >
      <div class="relative flex-1">
        <input
          ref="step2QueryInputRef"
          :value="customQuery"
          type="text"
          required
          :disabled="isSearching"
          placeholder="Refine title or search query..."
          class="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
          @input="$emit('update:customQuery', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <button
        type="submit"
        :disabled="isSearching || !customQuery.trim()"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
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
        <span>{{ isSearching ? 'Searching...' : 'Search' }}</span>
      </button>
    </form>

    <!-- Step 2 Error Alert -->
    <div
      v-if="step2Error"
      class="p-4 bg-red-950/50 border border-red-800/80 rounded-lg text-sm text-red-200 flex items-start gap-3"
    >
      <svg
        class="w-5 h-5 text-red-400 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{{ step2Error }}</span>
    </div>

    <div
      v-if="candidates.length === 0"
      class="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center"
    >
      <p class="text-zinc-400 text-sm mb-2">
        No metadata matches found for "{{ customQuery }}".
      </p>
      <p class="text-xs text-zinc-500 mb-4">
        Try adjusting your search query in the bar above or check the spelling.
      </p>
      <button
        type="button"
        class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition cursor-pointer"
        @click="$emit('back')"
      >
        Back to Step 1
      </button>
    </div>

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div
        v-for="candidate in candidates"
        :key="candidate.id"
        class="bg-zinc-900/70 border rounded-xl p-4 flex gap-4 transition cursor-pointer group"
        :class="selectedCandidate?.id === candidate.id
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20'
          : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'"
        @click="$emit('select', candidate)"
      >
        <!-- Poster image -->
        <div class="w-20 h-28 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-700/50 flex items-center justify-center">
          <img
            v-if="candidate.posterUrl"
            :src="candidate.posterUrl"
            :alt="candidate.title"
            class="w-full h-full object-cover"
            loading="lazy"
          >
          <div
            v-else
            class="text-zinc-600 text-xs text-center p-2"
          >
            No Poster
          </div>
        </div>

        <!-- Match info -->
        <div class="flex-1 flex flex-col justify-between overflow-hidden">
          <div>
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-semibold text-white text-sm group-hover:text-indigo-300 transition line-clamp-1">
                {{ candidate.title }}
              </h3>
              <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                {{ candidate.source }}
              </span>
            </div>
            <div class="text-xs text-zinc-400 mt-0.5">
              <span v-if="candidate.year">{{ candidate.year }}</span>
              <span v-else>Year unknown</span>
            </div>
            <p class="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
              {{ candidate.overview || 'No overview available.' }}
            </p>
          </div>

          <div class="mt-3 flex items-center justify-end">
            <span
              class="text-xs font-medium transition flex items-center gap-1"
              :class="selectedCandidate?.id === candidate.id ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'"
            >
              <svg
                v-if="selectedCandidate?.id === candidate.id"
                class="w-4 h-4 text-indigo-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>{{ selectedCandidate?.id === candidate.id ? 'Selected' : 'Select' }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between pt-4 border-t border-zinc-800">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
        @click="$emit('back')"
      >
        Back
      </button>
      <button
        type="button"
        :disabled="!selectedCandidate"
        class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        @click="$emit('confirm')"
      >
        Continue to Confirmation
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { MediaType } from '../../stores/requests';
import type { MetadataCandidate } from '../../views/RequestView.vue';

defineProps<{
  mediaType: MediaType;
  customQuery: string;
  isSearching: boolean;
  candidates: MetadataCandidate[];
  selectedCandidate: MetadataCandidate | null;
  step2Error: string | null;
}>();

defineEmits<{
  (e: 'update:customQuery', val: string): void;
  (e: 'search'): void;
  (e: 'select', candidate: MetadataCandidate): void;
  (e: 'confirm'): void;
  (e: 'back'): void;
  (e: 'skipMetadata'): void;
}>();

const step2QueryInputRef = ref<HTMLInputElement | null>(null);

defineExpose({
  step2QueryInputRef,
});
</script>
