<template>
  <div v-if="validBatchItems.length > 1" class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-white">
        Episode Review & Mapping
      </h3>
      <span class="text-xs text-zinc-400">
        Edit Season and Episode numbers before confirmation
      </span>
    </div>

    <!-- Quick Season Applicator Bar -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
      <div class="flex items-center gap-2">
        <span class="text-zinc-400 font-medium">Quick Apply Season:</span>
        <input
          :value="batchSeasonInput"
          type="number"
          min="1"
          placeholder="1"
          class="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          @input="$emit('update:batchSeasonInput', ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : null)"
        />
        <button
          type="button"
          class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition cursor-pointer"
          @click="$emit('applySeasonToAll')"
        >
          Apply to All
        </button>
      </div>
      <div class="flex items-center gap-3 text-zinc-400 font-mono">
        <span>{{ validBatchItems.length }} Episodes</span>
        <span>•</span>
        <span>{{ formatBytes(totalBatchSize) }} Total</span>
      </div>
    </div>

    <!-- Episode Mapping Table -->
    <div class="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/40">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400">
            <th class="px-3 py-2.5 font-medium w-12 text-center">#</th>
            <th class="px-3 py-2.5 font-medium w-24">Detected</th>
            <th class="px-3 py-2.5 font-medium w-24">Season</th>
            <th class="px-3 py-2.5 font-medium w-24">Episode</th>
            <th class="px-3 py-2.5 font-medium">File Name</th>
            <th class="px-3 py-2.5 font-medium w-24 text-right">Size</th>
            <th class="px-3 py-2.5 font-medium w-12 text-center">Remove</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-800/60">
          <tr
            v-for="(item, idx) in validBatchItems"
            :key="item.id"
            class="hover:bg-zinc-900/30 transition"
          >
            <td class="px-3 py-2 text-center text-zinc-500 font-mono text-xs">
              {{ idx + 1 }}
            </td>
            <td class="px-3 py-2 font-mono text-zinc-400 text-xs whitespace-nowrap">
              <span v-if="item.seasonNumber !== undefined || item.episodeNumber !== undefined" class="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-medium">
                S{{ String(item.seasonNumber ?? 1).padStart(2, '0') }}E{{ String(item.episodeNumber ?? 1).padStart(2, '0') }}
              </span>
              <span v-else class="text-zinc-600">—</span>
            </td>
            <td class="px-3 py-2">
              <input
                v-model.number="item.seasonNumber"
                type="number"
                min="1"
                class="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </td>
            <td class="px-3 py-2">
              <input
                v-model.number="item.episodeNumber"
                type="number"
                min="1"
                class="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </td>
            <td class="px-3 py-2 text-zinc-300 font-mono text-xs truncate max-w-xs" :title="item.fileName">
              {{ item.fileName }}
            </td>
            <td class="px-3 py-2 text-right text-zinc-400 font-mono text-xs whitespace-nowrap">
              {{ formatBytes(item.fileSizeBytes) }}
            </td>
            <td class="px-3 py-2 text-center">
              <button
                type="button"
                class="text-zinc-500 hover:text-red-400 p-1 text-xs transition cursor-pointer"
                title="Remove from batch"
                @click="$emit('removeBatchItem', item.id)"
              >
                ✕
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BatchItem } from '../../views/RequestView.vue';

defineProps<{
  validBatchItems: BatchItem[];
  batchSeasonInput: number | null;
  totalBatchSize: number;
  formatBytes: (bytes: number) => string;
}>();

defineEmits<{
  (e: 'update:batchSeasonInput', val: number | null): void;
  (e: 'applySeasonToAll'): void;
  (e: 'removeBatchItem', id: string): void;
}>();
</script>
