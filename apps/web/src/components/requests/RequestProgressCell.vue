<template>
  <div
    v-if="item.status === 'downloading'"
    class="space-y-1.5"
  >
    <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
      <div
        class="bg-blue-500 h-2 rounded-full transition-all duration-300"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>
    <div class="flex justify-between items-center text-[11px] text-zinc-400 font-mono">
      <span>{{ progressPercent }}%</span>
      <span>{{ progressSpeedEta }}</span>
    </div>
  </div>

  <div
    v-else-if="item.status === 'queued'"
    class="text-xs flex items-center gap-1.5"
    :class="item.deferredReason === 'waiting_for_space' ? 'text-amber-400/90' : 'text-blue-400/90'"
  >
    <span>
      {{ item.deferredReason === 'waiting_for_space' ? 'Waiting for storage quota headroom' : 'Waiting for available download slot' }}
    </span>
  </div>

  <div
    v-else-if="item.status === 'error'"
    class="text-xs text-red-400 max-w-xs truncate"
    :title="item.errorMessage || 'Unknown error occurred'"
  >
    {{ item.errorMessage || 'Download error' }}
  </div>

  <div
    v-else-if="item.status === 'seeding'"
    class="text-xs text-emerald-400/90 flex items-center gap-1"
  >
    <svg
      class="w-3.5 h-3.5"
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
