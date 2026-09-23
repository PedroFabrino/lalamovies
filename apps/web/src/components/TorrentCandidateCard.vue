<template>
  <div
    data-testid="release-candidate-item"
    class="p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-1.5"
    :class="selected ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500' : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'"
    @click="$emit('select', candidate)"
  >
    <div class="flex items-start justify-between gap-2">
      <span class="font-medium text-zinc-200 line-clamp-2">{{ candidate.title }}</span>
      <span class="font-bold text-zinc-300 shrink-0">{{ candidate.formattedSize }}</span>
    </div>
    <div class="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
      <span class="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">{{ candidate.indexer }}</span>
      <span
        v-if="candidate.resolution"
        class="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300"
      >{{ candidate.resolution }}</span>
      <span class="text-emerald-400 font-medium">▲ {{ candidate.seeders }}</span>
      <span class="text-zinc-500">▼ {{ candidate.leechers }}</span>
      <span
        v-if="candidate.isPreferred"
        class="px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-semibold"
      >★ Preferred</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReleaseCandidate } from '../lib/releaseExplorer';

defineProps<{
  candidate: ReleaseCandidate;
  selected: boolean;
}>();

defineEmits<{
  (e: 'select', candidate: ReleaseCandidate): void;
}>();
</script>
