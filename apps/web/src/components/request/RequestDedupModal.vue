<template>
  <div
    v-if="isVisible && canonicalRequest"
    data-testid="request-dedup-modal"
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
  >
    <div
      class="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
    >
      <div class="flex items-start gap-4">
        <div class="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-bold text-white">
            Already in System
          </h3>
          <p class="text-sm text-zinc-300 mt-1">
            "<strong>{{ canonicalRequest.title }}</strong>" is already {{ canonicalRequest.status === 'completed' || canonicalRequest.status === 'done' || canonicalRequest.status === 'seeding' ? 'available' : 'in progress' }} in the library.
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-400 font-medium">
            <span class="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 uppercase tracking-wider">
              Status: {{ canonicalRequest.status }}
            </span>
            <span
              v-if="canonicalRequest.seasonNumber != null"
              class="text-zinc-400"
            >
              Season {{ canonicalRequest.seasonNumber }}
              <span v-if="canonicalRequest.episodeNumber != null"> • Episode {{ canonicalRequest.episodeNumber }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs text-zinc-400">
        Adding it to your dashboard will allow you to track and access it immediately without initiating a duplicate download.
      </div>

      <div class="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
        <button
          type="button"
          data-testid="dedup-modal-cancel"
          class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
          @click="$emit('dismiss')"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="dedup-modal-confirm"
          class="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition cursor-pointer"
          @click="$emit('confirm')"
        >
          Add to My Dashboard
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanonicalRequestSummary } from '../../views/RequestView.vue';

defineProps<{
  canonicalRequest: CanonicalRequestSummary | null;
  isVisible: boolean;
}>();

defineEmits<{
  (e: 'confirm'): void;
  (e: 'dismiss'): void;
}>();
</script>
