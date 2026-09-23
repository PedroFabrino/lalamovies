<template>
  <div class="space-y-4">
    <div class="space-y-1">
      <label class="text-xs font-semibold text-zinc-300">Magnet Link</label>
      <input
        :value="magnet"
        type="text"
        data-testid="manual-magnet-input"
        placeholder="magnet:?xt=urn:btih:..."
        class="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-indigo-500 text-zinc-200 placeholder-zinc-600 font-mono"
        :disabled="Boolean(fileBase64)"
        @input="$emit('update:magnet', ($event.target as HTMLInputElement).value)"
      >
    </div>

    <div class="relative flex py-1 items-center">
      <div class="flex-grow border-t border-zinc-800" />
      <span class="flex-shrink mx-2 text-[10px] uppercase tracking-wider text-zinc-500">OR</span>
      <div class="flex-grow border-t border-zinc-800" />
    </div>

    <div class="space-y-1">
      <label class="text-xs font-semibold text-zinc-300">Upload .torrent File</label>
      <div class="flex items-center gap-2">
        <input
          ref="fileInputRef"
          type="file"
          accept=".torrent"
          data-testid="manual-file-input"
          class="hidden"
          @change="onFileChange"
        >
        <button
          type="button"
          data-testid="upload-torrent-btn"
          class="px-3 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition cursor-pointer"
          :disabled="Boolean(magnet.trim())"
          @click="fileInputRef?.click()"
        >
          Browse .torrent...
        </button>
        <span
          v-if="fileName"
          class="text-xs text-zinc-300 truncate max-w-xs"
        >
          {{ fileName }}
        </span>
        <button
          v-if="fileName"
          type="button"
          class="text-xs text-red-400 hover:underline"
          @click="onClear"
        >
          Clear
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  magnet: string;
  fileBase64: string | null;
  fileName: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:magnet', val: string): void;
  (e: 'fileSelected', file: File): void;
  (e: 'clearFile'): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) emit('fileSelected', file);
}

function onClear() {
  if (fileInputRef.value) fileInputRef.value.value = '';
  emit('clearFile');
}
</script>
