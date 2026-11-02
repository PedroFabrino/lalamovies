<template>
  <div
    data-testid="subtitle-row"
    class="p-3 bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 rounded-xl transition flex items-center justify-between gap-3"
    :class="{ 'ring-1 ring-violet-500/60 bg-zinc-900/90': selected }"
  >
    <!-- Checkbox & Release Name -->
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <input
        type="checkbox"
        data-testid="subtitle-checkbox"
        :checked="selected"
        :disabled="isApplying"
        class="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-500 cursor-pointer"
        @change="$emit('toggle-select', sub.fileId)"
      >
      <div class="min-w-0 flex-1">
        <div
          class="text-xs font-semibold text-zinc-100 truncate"
          :title="sub.releaseName"
        >
          {{ sub.releaseName }}
        </div>
        <div class="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-zinc-400">
          <span class="text-zinc-300 font-medium">@{{ sub.uploaderName }}</span>
          <span>•</span>
          <span class="text-violet-400 font-mono">⬇ {{ formatDownloadCount(sub.downloadCount) }}</span>
          <span v-if="sub.fileSizeBytes">•</span>
          <span
            v-if="sub.fileSizeBytes"
            class="font-mono"
          >{{ formatBytes(sub.fileSizeBytes) }}</span>
          <span v-if="sub.uploadDate">•</span>
          <span v-if="sub.uploadDate">{{ formatDate(sub.uploadDate) }}</span>
        </div>
      </div>
    </div>

    <!-- Row Apply Button -->
    <button
      type="button"
      data-testid="apply-row-btn"
      class="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
      :disabled="isApplying"
      @click="$emit('apply', sub.fileId)"
    >
      <Loader2
        v-if="isCurrentApplying"
        class="animate-spin w-3 h-3 text-violet-400"
      />
      <span>Apply</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
import { formatBytes } from '../../lib/formatters';

export interface SubtitleTrack {
  fileId: number | string;
  releaseName: string;
  language?: string;
  downloadCount: number;
  uploaderName: string;
  uploadDate?: string;
  fileSizeBytes?: number;
}

defineProps<{
  sub: SubtitleTrack;
  selected: boolean;
  isApplying: boolean;
  isCurrentApplying: boolean;
}>();

defineEmits<{
  (e: 'toggle-select', fileId: number | string): void;
  (e: 'apply', fileId: number | string): void;
}>();

function formatDownloadCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoStr;
  }
}
</script>
