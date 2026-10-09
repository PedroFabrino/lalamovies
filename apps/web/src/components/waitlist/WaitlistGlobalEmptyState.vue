<template>
  <div
    data-testid="waitlist-empty-state"
    class="border border-dashed border-zinc-800 rounded-2xl p-12 text-center bg-zinc-950/40 max-w-xl mx-auto my-8"
  >
    <div class="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-4 text-xl">
      ⏳
    </div>
    <h3 class="text-base font-semibold text-white">
      Your waitlist is empty
    </h3>
    <p class="text-sm text-zinc-400 mt-1 mb-6">
      Add unreleased movies, future TV seasons, or titles that don't have good releases yet. We'll monitor indexers and snatch them automatically.
    </p>
    <button
      type="button"
      data-testid="empty-add-waitlist-btn"
      class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition inline-flex items-center gap-2 cursor-pointer shadow"
      @click="$emit('add')"
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
          d="M12 4v16m8-8H4"
        />
      </svg>
      <span>Add your first title</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'add'): void;
}>();
</script>
