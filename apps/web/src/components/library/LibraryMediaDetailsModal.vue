<template>
  <div
    v-if="item"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    data-testid="library-media-details-modal"
    @click.self="$emit('close')"
  >
    <div
      class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-in"
    >
      <!-- Hero Artwork Backdrop Header -->
      <div class="relative aspect-[21/9] sm:aspect-[16/7] bg-zinc-950 overflow-hidden shrink-0">
        <img
          v-if="item.backdropUrl || item.posterUrl"
          :src="(item.backdropUrl || item.posterUrl) || ''"
          :alt="item.title"
          class="w-full h-full object-cover"
        >
        <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

        <!-- Close Button -->
        <button
          type="button"
          class="absolute top-4 right-4 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition z-10 backdrop-blur cursor-pointer"
          @click="$emit('close')"
        >
          <X class="w-4 h-4" />
        </button>

        <!-- Header Content Overlay -->
        <div class="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-600/80 text-white uppercase tracking-wider">
                {{ formatMediaType(item.mediaType) }}
              </span>
              <span
                v-if="item.year"
                class="text-xs text-zinc-300 font-medium"
              >
                {{ item.year }}
              </span>
              <span class="text-xs text-zinc-500">•</span>
              <span class="text-xs font-mono text-zinc-300">
                {{ formatBytes(item.sizeBytes) }}
              </span>
            </div>
            <h2 class="text-2xl font-bold text-white tracking-tight leading-tight line-clamp-2">
              {{ item.title }}
            </h2>
          </div>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-6 flex-1">
        <!-- Overview / Synopsis -->
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Overview
          </h4>
          <p class="text-sm text-zinc-300 leading-relaxed">
            {{ item.overview || 'Media files have been verified, indexed, and hardlinked into the permanent library for 24/7 direct streaming across Jellyfin clients.' }}
          </p>
        </div>

        <!-- Stream Quality Selector -->
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
            Stream Quality
          </h4>
          <div class="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              v-for="q in qualityOptions"
              :key="q.id"
              type="button"
              class="flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer"
              :class="selectedQuality === q.id ? 'bg-violet-600/20 border-violet-500 text-white shadow-lg shadow-violet-950/40' : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'"
              @click="selectedQuality = q.id"
            >
              <span class="text-xs font-bold">{{ q.label }}</span>
              <span class="text-[10px] text-zinc-400 mt-0.5">{{ q.desc }}</span>
            </button>
          </div>
        </div>

        <!-- Storage & Ownership Info -->
        <div class="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span class="text-zinc-400">Requested by:</span>
            <span class="text-zinc-200 font-semibold ml-1.5">@{{ item.requestedBy.username }}</span>
            <span
              v-if="item.coRequesters && item.coRequesters.length > 0"
              class="text-amber-400/90 ml-2"
            >
              (+{{ item.coRequesters.length }} co-requesters)
            </span>
          </div>
          <div
            v-if="item.jellyfinPath"
            class="text-zinc-400 truncate max-w-xs font-mono text-[11px]"
            :title="item.jellyfinPath"
          >
            {{ item.jellyfinPath }}
          </div>
        </div>
      </div>

      <!-- Modal Footer Actions -->
      <div class="p-4 bg-zinc-950/80 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <!-- Subtitle Picker Trigger -->
          <button
            v-if="item.mediaType === 'movie'"
            type="button"
            class="px-3 py-2 text-xs font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
            @click="$emit('open-subtitles', item.id, item.title)"
          >
            <Subtitles class="w-3.5 h-3.5 text-violet-400" />
            <span>Subtitles</span>
          </button>

          <!-- Episodes / Season Pack Modal Trigger -->
          <button
            v-else-if="item.requestIds && item.requestIds.length > 0"
            type="button"
            class="px-3 py-2 text-xs font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
            @click="$emit('open-episodes', item)"
          >
            <Layers class="w-3.5 h-3.5 text-violet-400" />
            <span>Episodes</span>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
            @click="$emit('close')"
          >
            Close
          </button>

          <!-- Watch in Jellyfin Action Button -->
          <a
            :href="jellyfinLaunchUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-600/30 transition flex items-center gap-2 cursor-pointer"
            data-testid="watch-jellyfin-btn"
          >
            <ExternalLink class="w-3.5 h-3.5" />
            <span>Watch in Jellyfin</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, Subtitles, Layers, ExternalLink } from 'lucide-vue-next';
import type { LibraryMediaItem } from './types';
import { formatBytes, formatMediaType } from '../../lib/formatters';

const props = defineProps<{
  item: LibraryMediaItem | null;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'open-subtitles', id: string, title: string): void;
  (e: 'open-episodes', item: LibraryMediaItem): void;
}>();

const selectedQuality = ref<'original' | '1080p' | '720p'>('original');

const qualityOptions = [
  { id: 'original' as const, label: 'Original', desc: 'Direct Play / Remux' },
  { id: '1080p' as const, label: '1080p', desc: 'Full HD Transcode' },
  { id: '720p' as const, label: '720p', desc: 'Mobile / Fast Stream' },
];

const jellyfinLaunchUrl = computed(() => {
  const base = 'https://watch.lalamovies.stream';
  if (!props.item) return base;
  return base;
});
</script>
