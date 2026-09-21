<template>
  <div
    data-testid="step3-manual-fallback"
    class="p-5 border border-indigo-500/40 rounded-xl bg-zinc-950/80 space-y-4"
  >
    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-sm font-semibold text-white flex items-center gap-2">
          <span>⚡ Manual Upload Fallback</span>
          <span class="text-[11px] font-normal text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
            Metadata Preserved
          </span>
        </h4>
        <p class="text-xs text-zinc-400 mt-0.5">
          Attach a magnet link or .torrent file for <strong>{{ selectedCandidate?.title }}</strong>
        </p>
      </div>
      <button
        type="button"
        data-testid="cancel-manual-fallback"
        class="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
        @click="$emit('cancel')"
      >
        Back to Releases
      </button>
    </div>

    <!-- Fallback mode tabs: magnet or file -->
    <div class="flex gap-2 border-b border-zinc-800 pb-2">
      <button
        type="button"
        data-testid="fallback-tab-magnet"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
        :class="manualFallbackMode === 'magnet' ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
        @click="$emit('update:manualFallbackMode', 'magnet')"
      >
        🧲 Magnet Link
      </button>
      <button
        type="button"
        data-testid="fallback-tab-file"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
        :class="manualFallbackMode === 'file' ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
        @click="$emit('update:manualFallbackMode', 'file')"
      >
        📁 Torrent File
      </button>
    </div>

    <!-- Magnet Input -->
    <div
      v-if="manualFallbackMode === 'magnet'"
      class="space-y-2"
    >
      <label class="block text-xs font-medium text-zinc-300">Paste Magnet Link</label>
      <input
        :value="fallbackMagnetLink"
        data-testid="step3-fallback-magnet-input"
        type="text"
        placeholder="magnet:?xt=urn:btih:..."
        class="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        @input="$emit('update:fallbackMagnetLink', ($event.target as HTMLInputElement).value)"
      >
    </div>

    <!-- File Input -->
    <div
      v-else
      class="space-y-2"
    >
      <label class="block text-xs font-medium text-zinc-300">Upload .torrent File</label>
      <input
        type="file"
        data-testid="step3-fallback-file-input"
        accept=".torrent"
        class="block w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
        @change="$emit('handleFallbackFileChange', $event)"
      >
      <p
        v-if="fallbackFile"
        class="text-xs text-emerald-400 font-mono mt-1"
      >
        ✓ Selected: {{ fallbackFile.name }} ({{ formatBytes(fallbackFile.size) }})
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatBytes } from '../../lib/formatters';
import type { MetadataCandidate } from '../../composables/useRequestData';

defineProps<{
  selectedCandidate?: MetadataCandidate | null;
  manualFallbackMode: 'magnet' | 'file';
  fallbackMagnetLink: string;
  fallbackFile?: File | null;
}>();

defineEmits<{
  (e: 'update:manualFallbackMode', val: 'magnet' | 'file'): void;
  (e: 'update:fallbackMagnetLink', val: string): void;
  (e: 'cancel'): void;
  (e: 'handleFallbackFileChange', event: Event): void;
}>();
</script>
