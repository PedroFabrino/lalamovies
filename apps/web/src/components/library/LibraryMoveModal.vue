<template>
  <div
    v-if="show"
    data-testid="move-modal"
    class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    @click.self="$emit('close')"
  >
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in">
      <div>
        <h2 class="text-lg font-bold text-white flex items-center gap-2">
          <FolderSync class="w-5 h-5 text-violet-400" />
          <span>Move Media Library Folders</span>
        </h2>
        <p class="text-xs text-zinc-400 mt-1">
          Relocate selected items to another Jellyfin library folder. Physical directories will be moved on disk and seeding hardlinks will remain intact.
        </p>
      </div>

      <!-- Selected Items Summary -->
      <div class="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 max-h-36 overflow-y-auto space-y-1">
        <div
          v-for="item in selectedItems"
          :key="item.id"
          class="text-xs text-zinc-300 truncate flex items-center gap-1.5"
        >
          <span class="text-violet-400">•</span>
          <span class="font-medium">{{ item.title }}</span>
          <span
            v-if="item.year"
            class="text-zinc-500"
          >({{ item.year }})</span>
        </div>
      </div>

      <!-- Target Destination Category Selector -->
      <div>
        <label class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
          Target Destination Folder
        </label>
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            class="px-3 py-2 text-xs font-medium rounded-xl border transition text-center cursor-pointer"
            :class="targetCategory === 'movie' ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-950/40' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'"
            @click="targetCategory = 'movie'"
          >
            Movies
          </button>
          <button
            type="button"
            class="px-3 py-2 text-xs font-medium rounded-xl border transition text-center cursor-pointer"
            :class="targetCategory === 'tv_show' ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-950/40' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'"
            @click="targetCategory = 'tv_show'"
          >
            TV Shows
          </button>
          <button
            type="button"
            class="px-3 py-2 text-xs font-medium rounded-xl border transition text-center cursor-pointer"
            :class="targetCategory === 'anime' ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-950/40' : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'"
            @click="targetCategory = 'anime'"
          >
            Anime
          </button>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-xl transition cursor-pointer"
          :disabled="isMoving"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="confirm-move-btn"
          class="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-violet-600/30 disabled:opacity-50"
          :disabled="isMoving"
          @click="$emit('confirm', targetCategory)"
        >
          <Loader2
            v-if="isMoving"
            class="w-3.5 h-3.5 animate-spin"
          />
          <span>{{ isMoving ? 'Moving...' : 'Confirm Move' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { FolderSync, Loader2 } from 'lucide-vue-next';
import type { LibraryMediaItem } from './types';

const props = defineProps<{
  show: boolean;
  selectedItems: LibraryMediaItem[];
  defaultCategory: 'movie' | 'tv_show' | 'anime';
  isMoving: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', targetCategory: 'movie' | 'tv_show' | 'anime'): void;
}>();

const targetCategory = ref<'movie' | 'tv_show' | 'anime'>(props.defaultCategory);

watch(
  () => props.defaultCategory,
  (newVal) => {
    targetCategory.value = newVal;
  },
);
</script>
