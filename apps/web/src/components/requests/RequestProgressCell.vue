<template>
  <div
    v-if="item.status === 'downloading'"
    class="space-y-1.5"
  >
    <div class="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden shadow-inner">
      <div
        class="bg-gradient-to-r from-blue-500 to-indigo-500 bar-stripes h-2 rounded-full transition-all duration-300 shadow-sm"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>
    <div class="flex justify-between items-center text-[11px] text-zinc-400 font-mono">
      <span class="text-blue-400 font-semibold">{{ progressPercent }}%</span>
      <span>{{ progressSpeedEta }}</span>
    </div>
  </div>

  <div
    v-else-if="item.status === 'queued'"
    class="text-xs flex items-center gap-1.5"
    :class="item.deferredReason === 'waiting_for_space' ? 'text-amber-400/90' : 'text-blue-400/90'"
  >
    <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
    <span>
      {{ item.deferredReason === 'waiting_for_space' ? 'Waiting for storage quota headroom' : 'Waiting for available download slot' }}
    </span>
  </div>

  <div
    v-else-if="item.status === 'error'"
    class="text-xs text-red-400 max-w-xs truncate flex items-center gap-1.5"
    :title="item.errorMessage || 'Unknown error occurred'"
  >
    <span class="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
    <span>{{ item.errorMessage || 'Download error' }}</span>
  </div>

  <div
    v-else-if="item.status === 'seeding'"
    class="text-xs text-emerald-400/90 flex items-center gap-1.5 font-medium"
  >
    <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow" />
    <span>In Jellyfin library</span>
  </div>

  <div
    v-else
    class="text-xs text-zinc-500"
  >
    —
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DownloadRequest, useRequestsStore } from '../../stores/requests';
import { formatSpeed, formatEta } from '../../lib/formatters';

const props = defineProps<{
  item: DownloadRequest;
}>();

const requestsStore = useRequestsStore();

const progressPercent = computed(() => {
  const p = requestsStore.progressMap[props.item.id];
  if (!p) return 0;
  return Math.min(100, Math.max(0, Math.round(p.progress * 100)));
});

const progressSpeedEta = computed(() => {
  const p = requestsStore.progressMap[props.item.id];
  if (!p) return '—';
  const speed = formatSpeed(p.speedBps);
  const eta = formatEta(p.etaSeconds);
  return `${speed} — ETA ${eta}`;
});
</script>
