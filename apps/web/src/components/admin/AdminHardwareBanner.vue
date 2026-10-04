<script setup lang="ts">
import type { SystemMetrics } from '../../composables/useAdminActivity';

defineProps<{
  system: SystemMetrics | null;
}>();

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 GB';
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function getUsageColor(percent: number): string {
  if (percent >= 90) return 'bg-rose-500';
  if (percent >= 75) return 'bg-amber-500';
  return 'bg-emerald-500';
}
</script>

<template>
  <div
    v-if="system"
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
  >
    <!-- CPU Card -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
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
                d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m16-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">
              Host CPU
            </h3>
            <p class="text-xs text-zinc-400">
              {{ system.cpuCores }} Cores
            </p>
          </div>
        </div>
        <span class="text-lg font-bold text-white">{{ system.cpuPercent }}%</span>
      </div>
      <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="getUsageColor(system.cpuPercent)"
          :style="{ width: `${Math.min(100, Math.max(0, system.cpuPercent))}%` }"
        />
      </div>
    </div>

    <!-- RAM Card -->
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">
              Memory (RAM)
            </h3>
            <p class="text-xs text-zinc-400">
              {{ formatBytes(system.memUsedBytes) }} / {{ formatBytes(system.memTotalBytes) }}
            </p>
          </div>
        </div>
        <span class="text-lg font-bold text-white">
          {{ Math.round((system.memUsedBytes / (system.memTotalBytes || 1)) * 100) }}%
        </span>
      </div>
      <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="getUsageColor(Math.round((system.memUsedBytes / (system.memTotalBytes || 1)) * 100))"
          :style="{ width: `${Math.min(100, Math.max(0, Math.round((system.memUsedBytes / (system.memTotalBytes || 1)) * 100)))}%` }"
        />
      </div>
    </div>

    <!-- GPU Card (Only if system.gpu is present) -->
    <div
      v-if="system.gpu"
      class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div class="min-w-0">
            <h3
              class="text-sm font-semibold text-white truncate"
              :title="system.gpu.name"
            >
              {{ system.gpu.name }}
            </h3>
            <p
              v-if="system.gpu.driverVersion"
              class="text-xs text-zinc-400"
            >
              Driver {{ system.gpu.driverVersion }}
            </p>
          </div>
        </div>
      </div>

      <!-- GPU Submeters (3D, NVENC, VRAM) -->
      <div class="space-y-2.5 pt-1">
        <!-- 3D Utilization -->
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-zinc-400 font-medium">3D Core</span>
            <span class="text-zinc-200 font-semibold">{{ system.gpu.utilizationGpuPercent }}%</span>
          </div>
          <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="getUsageColor(system.gpu.utilizationGpuPercent)"
              :style="{ width: `${Math.min(100, Math.max(0, system.gpu.utilizationGpuPercent))}%` }"
            />
          </div>
        </div>

        <!-- Video Encoder (NVENC) -->
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-zinc-400 font-medium">NVENC Video Encoder</span>
            <span class="text-zinc-200 font-semibold">{{ system.gpu.utilizationEncoderPercent }}%</span>
          </div>
          <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="getUsageColor(system.gpu.utilizationEncoderPercent)"
              :style="{ width: `${Math.min(100, Math.max(0, system.gpu.utilizationEncoderPercent))}%` }"
            />
          </div>
        </div>

        <!-- VRAM -->
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-zinc-400 font-medium">
              VRAM ({{ formatBytes(system.gpu.vramUsedBytes) }} / {{ formatBytes(system.gpu.vramTotalBytes) }})
            </span>
            <span class="text-zinc-200 font-semibold">
              {{ Math.round((system.gpu.vramUsedBytes / (system.gpu.vramTotalBytes || 1)) * 100) }}%
            </span>
          </div>
          <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="getUsageColor(Math.round((system.gpu.vramUsedBytes / (system.gpu.vramTotalBytes || 1)) * 100))"
              :style="{ width: `${Math.min(100, Math.max(0, Math.round((system.gpu.vramUsedBytes / (system.gpu.vramTotalBytes || 1)) * 100)))}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
