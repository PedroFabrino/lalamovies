<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
    <!-- Active Downloads -->
    <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-zinc-400">Active Downloads</span>
        <div class="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Activity class="w-4 h-4" />
        </div>
      </div>
      <p class="text-2xl font-bold tracking-tight text-white font-mono">
        {{ activeCount }}
      </p>
      <p class="text-[11px] text-zinc-500 mt-1">
        In queue & downloading
      </p>
    </div>

    <!-- Total Transfer Speed -->
    <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-zinc-400">Total Speed</span>
        <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Download class="w-4 h-4" />
        </div>
      </div>
      <p class="text-2xl font-bold tracking-tight text-emerald-400 font-mono">
        {{ formattedSpeed }}
      </p>
      <p class="text-[11px] text-zinc-500 mt-1">
        Real-Debrid & torrents
      </p>
    </div>

    <!-- Completed Requests -->
    <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-zinc-400">In Library</span>
        <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <CheckCircle class="w-4 h-4" />
        </div>
      </div>
      <p class="text-2xl font-bold tracking-tight text-white font-mono">
        {{ completedCount }}
      </p>
      <p class="text-[11px] text-zinc-500 mt-1">
        Ready for playback
      </p>
    </div>

    <!-- Total Requests & Watch Parties -->
    <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-zinc-400">Total Media</span>
        <div class="w-8 h-8 rounded-lg bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-neon">
          <Film class="w-4 h-4" />
        </div>
      </div>
      <p class="text-2xl font-bold tracking-tight text-white font-mono">
        {{ totalCount }}
      </p>
      <p class="text-[11px] text-zinc-500 mt-1">
        Catalog items requested
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Activity, Download, CheckCircle, Film } from 'lucide-vue-next';
import { useRequestsStore } from '../../stores/requests';
import { formatSpeed } from '../../lib/formatters';

const requestsStore = useRequestsStore();

const activeCount = computed(() => {
  return requestsStore.requests.filter((r) => r.status === 'downloading' || r.status === 'queued').length;
});

const completedCount = computed(() => {
  return requestsStore.requests.filter((r) => r.status === 'seeding' || r.status === 'done').length;
});

const totalCount = computed(() => {
  return requestsStore.requests.length;
});

const formattedSpeed = computed(() => {
  let totalSpeedBps = 0;
  for (const progress of Object.values(requestsStore.progressMap)) {
    if (progress && progress.speedBps) {
      totalSpeedBps += progress.speedBps;
    }
  }
  return formatSpeed(totalSpeedBps);
});
</script>
