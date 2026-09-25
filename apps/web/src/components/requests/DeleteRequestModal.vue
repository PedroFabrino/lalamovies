<template>
  <div
    v-if="item"
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
  >
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
      <div class="flex items-center gap-3 text-red-400 mb-3">
        <div class="w-10 h-10 rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center shrink-0">
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white">
            Delete Download Request?
          </h3>
        </div>
      </div>

      <p class="text-sm text-zinc-300 mb-2">
        Are you sure you want to delete <strong class="text-white">{{ item.title }}</strong>?
      </p>
      <p class="text-xs text-zinc-500 mb-6">
        This will remove the torrent from qBittorrent and delete media files from the library. This action cannot be undone.
      </p>

      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
          :disabled="isDeleting"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          :disabled="isDeleting"
          @click="emit('confirm')"
        >
          <svg
            v-if="isDeleting"
            class="animate-spin h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span>{{ isDeleting ? 'Deleting...' : 'Confirm Delete' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DownloadRequest } from '../../stores/requests';

defineProps<{
  item: DownloadRequest | null;
  isDeleting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>
