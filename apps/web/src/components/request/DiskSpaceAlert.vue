<template>
  <div
    v-if="error"
    data-testid="disk-space-alert"
    class="p-4 bg-red-950/60 border border-red-800 rounded-lg text-sm text-red-200 flex items-start gap-3"
  >
    <svg
      class="w-5 h-5 text-red-400 shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <div class="flex-1 min-w-0">
      <div class="font-semibold text-red-300 flex items-center justify-between">
        <span>Cannot Submit Request</span>
        <span
          v-if="quotaPercent != null"
          class="text-xs font-mono font-normal text-red-400"
        >
          Quota: {{ quotaPercent }}%
        </span>
      </div>
      <div class="mt-0.5">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  error: string | null;
  quotaPercent?: number | null;
}>();
</script>
