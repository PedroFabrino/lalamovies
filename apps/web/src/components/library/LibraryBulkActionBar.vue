<template>
  <div
    v-if="selectedCount > 0"
    data-testid="bulk-action-bar"
    class="fixed bottom-6 inset-x-0 max-w-2xl mx-auto px-4 z-30 transition-all duration-200"
  >
    <div class="glass-strong border border-zinc-700/80 shadow-2xl rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
        <span class="text-sm font-semibold text-white">
          {{ selectedCount }} item{{ selectedCount > 1 ? 's' : '' }} selected
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          data-testid="bulk-move-btn"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl shadow-md transition cursor-pointer"
          @click="$emit('open-move')"
        >
          <FolderSync class="w-3.5 h-3.5" />
          <span>Move to...</span>
        </button>

        <button
          type="button"
          data-testid="bulk-delete-btn"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-md transition cursor-pointer"
          @click="$emit('open-delete')"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        <button
          type="button"
          class="text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 transition cursor-pointer"
          @click="$emit('clear-selection')"
        >
          Deselect
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderSync, Trash2 } from 'lucide-vue-next';

defineProps<{
  selectedCount: number;
}>();

defineEmits<{
  (e: 'open-move'): void;
  (e: 'open-delete'): void;
  (e: 'clear-selection'): void;
}>();
</script>
