<template>
  <div
    v-if="validBatchItems.length > 1"
    class="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-3"
  >
    <div class="flex items-center justify-between text-xs">
      <span class="font-semibold text-zinc-300">
        Batch Upload ({{ validBatchItems.length }} torrents)
      </span>
      <span class="text-zinc-400 font-mono">
        Total Size: {{ formatBytes(totalBatchSize) }}
      </span>
    </div>

    <div class="flex items-center gap-2 pt-2 border-t border-zinc-800">
      <label
        for="step3BatchSeason"
        class="text-xs text-zinc-400"
      >Apply Season to All:</label>
      <input
        id="step3BatchSeason"
        :value="batchSeasonInput"
        type="number"
        min="1"
        placeholder="1"
        class="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-white"
        @input="$emit('update:batchSeasonInput', ($event.target as HTMLInputElement).value ? parseInt(($event.target as HTMLInputElement).value, 10) : null)"
      >
      <button
        type="button"
        class="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded cursor-pointer transition"
        @click="$emit('applySeasonToAll')"
      >
        Apply
      </button>
    </div>

    <div class="max-h-40 overflow-y-auto space-y-1.5 pr-1">
      <div
        v-for="item in validBatchItems"
        :key="item.id"
        class="p-2 bg-zinc-900/50 border border-zinc-800/80 rounded flex items-center justify-between text-xs"
      >
        <span
          class="text-zinc-300 truncate max-w-[280px]"
          :title="item.fileName"
        >
          {{ item.fileName }}
        </span>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-zinc-500 font-mono text-[11px]">
            {{ formatBytes(item.parsed?.totalSize || item.fileSizeBytes) }}
          </span>
          <button
            type="button"
            class="text-zinc-500 hover:text-red-400 cursor-pointer"
            @click="$emit('removeBatchItem', item.id)"
          >
            ×
          </button>
        </div>
      </div>
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
