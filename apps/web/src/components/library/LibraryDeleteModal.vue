<template>
  <div
    v-if="show"
    data-testid="delete-modal"
    class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    @click.self="$emit('close')"
  >
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in">
      <div>
        <h2 class="text-lg font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle class="w-5 h-5" />
          <span>Permanent Media Deletion</span>
        </h2>
        <p class="text-xs text-zinc-400 mt-1">
          This will permanently delete files from disk, remove active torrents from qBittorrent, and trigger a Jellyfin library rescan. This action cannot be undone.
        </p>
      </div>

      <!-- Co-requester Warning Alert -->
      <div
        v-if="hasCoRequestersInSelection"
        data-testid="co-requester-warning"
        class="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3.5 text-xs text-amber-300 space-y-1.5"
      >
        <div class="font-semibold flex items-center gap-1.5 text-amber-200">
          <Info class="w-4 h-4" />
          <span>Warning: Co-requesters attached!</span>
        </div>
        <p class="text-amber-300/90 leading-relaxed">
          The following items were also requested by other users:
        </p>
        <ul class="list-disc list-inside space-y-0.5 text-amber-200">
          <li
            v-for="item in itemsWithCoRequesters"
            :key="item.id"
          >
            <span class="font-medium">{{ item.title }}</span>: co-requested with
            {{ item.coRequesters.map((u) => `@${u.username}`).join(', ') }}
          </li>
        </ul>
      </div>

      <!-- Selected Items Summary -->
      <div class="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 max-h-36 overflow-y-auto space-y-1">
        <div
          v-for="item in selectedItems"
          :key="item.id"
          class="text-xs text-zinc-300 truncate flex items-center gap-1.5"
        >
          <span class="text-red-400">•</span>
          <span class="font-medium">{{ item.title }}</span>
          <span
            v-if="item.year"
            class="text-zinc-500"
          >({{ item.year }})</span>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-xl transition cursor-pointer"
          :disabled="isDeleting"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="confirm-delete-btn"
          class="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-red-600/30 disabled:opacity-50"
          :disabled="isDeleting"
          @click="$emit('confirm')"
        >
          <Loader2
            v-if="isDeleting"
            class="w-3.5 h-3.5 animate-spin"
          />
          <span>{{ isDeleting ? 'Deleting...' : 'Delete Permanently' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle, Info, Loader2 } from 'lucide-vue-next';
import type { LibraryMediaItem } from './types';

const props = defineProps<{
  show: boolean;
  selectedItems: LibraryMediaItem[];
  isDeleting: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

const itemsWithCoRequesters = computed(() => {
  return props.selectedItems.filter(
    (item) => item.coRequesters && item.coRequesters.length > 0,
  );
});

const hasCoRequestersInSelection = computed(() => {
  return itemsWithCoRequesters.value.length > 0;
});
</script>
