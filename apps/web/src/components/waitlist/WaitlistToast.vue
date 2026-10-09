<template>
  <div
    v-if="toast"
    data-testid="waitlist-toast"
    class="mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg"
    :class="toast.type === 'error'
      ? 'bg-red-950/60 border-red-800 text-red-200'
      : toast.type === 'success'
        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
        : 'bg-indigo-950/60 border-indigo-800 text-indigo-200'"
  >
    <div class="flex items-center gap-3">
      <svg
        class="w-5 h-5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span class="text-sm font-medium">{{ toast.text }}</span>
    </div>
    <button
      type="button"
      class="p-1 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
      @click="$emit('dismiss')"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  toast: { text: string; type: 'info' | 'success' | 'error' } | null;
}>();

defineEmits<{
  (e: 'dismiss'): void;
}>();
</script>
