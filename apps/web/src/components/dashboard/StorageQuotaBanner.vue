<template>
  <div
    v-if="diskInfo"
    class="mb-6 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
  >
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0">
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16m-5 4h.01m-4 0h.01m-4 0h.01"
          />
        </svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Media Storage Quota</span>
          <span
            class="px-2 py-0.5 rounded text-[11px] font-medium border"
            :class="diskInfo.quotaUsedPercent >= 100 || diskInfo.percentFree <= diskInfo.rejectThreshold
              ? 'bg-red-950/80 text-red-300 border-red-800'
              : diskInfo.quotaUsedPercent >= 80 || diskInfo.percentFree <= diskInfo.warnThreshold
                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'"
          >
            {{ diskInfo.quotaUsedPercent >= 100 ? 'Quota Exceeded' : diskInfo.quotaUsedPercent >= 80 ? 'Quota Warning' : 'Healthy' }}
          </span>
        </div>
        <p class="text-sm font-semibold text-white mt-0.5">
          {{ diskInfo.storageFootprintGb }} GB <span class="text-xs font-normal text-zinc-400">used of</span> {{ diskInfo.storageQuotaGb }} GB <span class="text-xs font-normal text-zinc-400">quota ({{ diskInfo.quotaUsedPercent }}%)</span>
        </p>
      </div>
    </div>

    <div class="flex items-center gap-4 min-w-[240px] max-w-sm flex-1">
      <div class="w-full bg-zinc-950 border border-zinc-800 rounded-full h-2.5 overflow-hidden p-0.5">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="diskInfo.quotaUsedPercent >= 100 ? 'bg-red-500' : diskInfo.quotaUsedPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'"
          :style="{ width: `${Math.min(100, Math.max(0, diskInfo.quotaUsedPercent))}%` }"
        />
      </div>
      <router-link
        to="/admin"
        class="text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap transition cursor-pointer"
      >
        Manage &rarr;
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface DiskInfo {
  storageQuotaGb: number;
  storageFootprintGb: number;
  quotaUsedPercent: number;
  percentFree: number;
  warnThreshold: number;
  rejectThreshold: number;
}

defineProps<{
  diskInfo: DiskInfo | null;
}>();
</script>
