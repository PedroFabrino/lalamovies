<template>
  <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
    <div class="border-b border-zinc-800 pb-3 flex items-center justify-between">
      <div>
        <h3 class="text-base font-semibold text-white">
          {{ title }}
        </h3>
        <p class="text-xs text-zinc-400 mt-0.5">
          {{ description }}
        </p>
      </div>
      <span class="text-xs text-zinc-500 font-mono">{{ flags.length }} subsystems</span>
    </div>

    <div
      v-if="isLoading && flags.length === 0"
      class="h-20 bg-zinc-950/40 rounded-xl animate-pulse"
    />
    <div
      v-else-if="flags.length === 0"
      class="py-4 text-center text-xs text-zinc-500"
    >
      No subsystem flags found in this category.
    </div>
    <div
      v-else
      class="divide-y divide-zinc-800/60"
    >
      <div
        v-for="flag in flags"
        :key="flag.id"
        class="py-4 first:pt-2 last:pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2.5">
            <span class="font-medium text-white text-sm">{{ flag.name }}</span>
            <span
              class="px-2 py-0.5 text-[11px] font-semibold rounded-full border"
              :class="flag.enabled ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-rose-950/60 border-rose-800 text-rose-400'"
            >
              {{ flag.enabled ? 'Operational' : 'Disabled' }}
            </span>
            <span
              v-if="highImpactFlags.includes(flag.id)"
              class="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-950/60 border border-amber-800 text-amber-300"
            >
              High Impact
            </span>
          </div>
          <p class="text-xs text-zinc-400 max-w-2xl">
            {{ flag.description }}
          </p>
          <div class="text-[11px] text-zinc-500 flex items-center gap-3 pt-0.5">
            <span>Key: <code class="text-zinc-400">{{ flag.id }}</code></span>
            <span>•</span>
            <span>Updated: {{ formatDate(flag.updatedAt) }}</span>
          </div>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <button
            type="button"
            role="switch"
            :aria-checked="flag.enabled"
            :disabled="isUpdatingFlag === flag.id"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50"
            :class="flag.enabled ? 'bg-violet-600' : 'bg-zinc-700'"
            @click="$emit('toggle', flag)"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="flag.enabled ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminFeatureFlag } from './AdminFeaturesTab.vue';

defineProps<{
  title: string;
  description: string;
  flags: AdminFeatureFlag[];
  isLoading: boolean;
  isUpdatingFlag: string | null;
  highImpactFlags: string[];
}>();

defineEmits<{
  (e: 'toggle', flag: AdminFeatureFlag): void;
}>();

function formatDate(isoStr?: string): string {
  if (!isoStr) return 'Never';
  try {
    return new Date(isoStr).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}
</script>
