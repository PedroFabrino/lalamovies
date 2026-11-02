<template>
  <div
    class="group relative flex flex-col rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-950/30 transition-all duration-300 overflow-hidden"
    :class="{ 'ring-2 ring-violet-500 border-violet-500/80': selected }"
  >
    <!-- Artwork Aspect Ratio Container -->
    <div
      class="relative aspect-[16/10] bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-800/80 cursor-pointer"
      @click="$emit('open-details', item)"
    >
      <img
        v-if="item.backdropUrl || item.posterUrl"
        :src="(item.backdropUrl || item.posterUrl) || ''"
        :alt="item.title"
        class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
      >

      <!-- Cinema Gradient Overlays -->
      <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-0 pointer-events-none" />

      <!-- Fallback Artwork Icon -->
      <div
        v-if="!item.backdropUrl && !item.posterUrl"
        class="text-zinc-700 z-0 flex flex-col items-center gap-1"
      >
        <Film class="w-10 h-10 opacity-30 text-zinc-500" />
      </div>

      <!-- Quick Play/Inspect Hover Overlay -->
      <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px] z-10 pointer-events-none">
        <div class="px-3.5 py-1.5 rounded-full bg-violet-600/90 text-white font-medium text-xs shadow-lg shadow-violet-600/40 flex items-center gap-1.5">
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>View Details</span>
        </div>
      </div>

      <!-- Selection Checkbox (Top-Left) -->
      <div
        class="absolute top-3 left-3 z-20"
        @click.stop
      >
        <div
          class="relative inline-flex items-center"
          :title="!item.canManage ? 'Only the requester or an admin can manage this item' : undefined"
        >
          <input
            type="checkbox"
            data-testid="item-checkbox"
            :checked="selected"
            :disabled="!item.canManage"
            class="w-5 h-5 rounded border-zinc-700 bg-zinc-900/90 text-violet-600 focus:ring-violet-500 shadow-sm transition"
            :class="!item.canManage ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'"
            @change="$emit('toggle-select', item.id)"
          >
        </div>
      </div>

      <!-- Requester Badge (Top-Right) -->
      <div
        class="absolute top-3 right-3 z-20"
        @click.stop
      >
        <span
          v-if="isOwned"
          data-testid="badge-you"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 backdrop-blur-md"
        >
          You
        </span>
        <span
          v-else
          data-testid="badge-other"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900/80 text-zinc-300 border border-zinc-700/60 backdrop-blur-md"
        >
          @{{ item.requestedBy.username }}
        </span>
      </div>

      <!-- Media Size Badge (Bottom-Right) -->
      <div class="absolute bottom-2.5 right-3 z-20">
        <span class="text-[11px] font-mono text-zinc-300 bg-zinc-900/90 px-2 py-0.5 rounded-md border border-zinc-800 backdrop-blur-md">
          {{ formatBytes(item.sizeBytes) }}
        </span>
      </div>
    </div>

    <!-- Card Body -->
    <div class="p-4 flex-1 flex flex-col justify-between">
      <div>
        <div class="flex items-start justify-between gap-2 mb-1">
          <h3
            class="font-semibold text-white text-base leading-snug line-clamp-2 hover:text-violet-300 transition cursor-pointer"
            :title="item.title"
            @click="$emit('open-details', item)"
          >
            {{ item.title }}
          </h3>

          <!-- Subtitle / Episode Management Buttons -->
          <button
            v-if="item.mediaType === 'movie'"
            type="button"
            data-testid="library-subtitles-btn"
            class="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer shrink-0"
            title="Manage Subtitles (pt-BR)"
            @click.stop="$emit('open-subtitles', item.id, item.title)"
          >
            <Subtitles class="w-4 h-4" />
          </button>
          <button
            v-else-if="item.requestIds && item.requestIds.length > 0"
            type="button"
            data-testid="library-episodes-btn"
            class="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer shrink-0"
            title="Manage Episodes & Pruning"
            @click.stop="$emit('open-episodes', item)"
          >
            <Layers class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center gap-2 text-xs text-zinc-400 mb-3">
          <span
            v-if="item.year"
            class="font-medium text-zinc-300"
          >{{ item.year }}</span>
          <span v-if="item.year">•</span>
          <span class="capitalize text-zinc-400">{{ formatMediaType(item.mediaType) }}</span>
          <span
            v-if="item.coRequesters && item.coRequesters.length > 0"
            class="text-amber-400/90 text-[11px]"
            :title="coRequestersTooltip"
          >
            • +{{ item.coRequesters.length }} co-requester{{ item.coRequesters.length > 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <!-- Series / Anime Seasons Accordion -->
      <div
        v-if="item.seasons && item.seasons.length > 0"
        class="pt-2 border-t border-zinc-800/60 mt-2"
      >
        <button
          type="button"
          data-testid="expand-seasons-btn"
          class="w-full flex items-center justify-between text-xs text-violet-400 hover:text-violet-300 py-1 transition cursor-pointer"
          @click="expanded = !expanded"
        >
          <span class="font-medium">
            {{ item.seasons.length }} Season{{ item.seasons.length > 1 ? 's' : '' }}
            ({{ totalEpisodes }} episodes)
          </span>
          <ChevronDown
            class="w-3.5 h-3.5 transition-transform"
            :class="{ 'rotate-180': expanded }"
          />
        </button>

        <!-- Expanded Seasons / Episodes List -->
        <div
          v-if="expanded"
          data-testid="expanded-seasons-content"
          class="mt-2.5 space-y-2 text-xs text-zinc-300 max-h-48 overflow-y-auto pr-1"
        >
          <div
            v-for="season in item.seasons"
            :key="season.seasonNumber"
            class="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80"
          >
            <div class="flex items-center justify-between font-semibold text-zinc-200 mb-1">
              <span>Season {{ season.seasonNumber }}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-mono text-zinc-400">{{ formatBytes(season.sizeBytes) }}</span>
                <button
                  v-if="season.episodes.length > 0"
                  type="button"
                  data-testid="season-episodes-btn"
                  class="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-violet-300 border border-zinc-700/60 transition cursor-pointer"
                  title="Manage Episodes & Pruning"
                  @click.stop="$emit('open-episodes', item, season.episodes[0].id)"
                >
                  Episodes
                </button>
              </div>
            </div>
            <div class="space-y-1 pl-1">
              <div
                v-for="ep in season.episodes"
                :key="ep.id"
                class="flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200"
              >
                <span class="truncate pr-2">
                  {{ ep.episodeNumber ? `E${ep.episodeNumber}: ` : '' }}{{ ep.title }}
                </span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="font-mono whitespace-nowrap">{{ formatBytes(ep.sizeBytes) }}</span>
                  <button
                    type="button"
                    data-testid="episode-subtitles-btn"
                    class="p-0.5 text-zinc-400 hover:text-violet-400 rounded transition cursor-pointer"
                    :title="`Subtitles for ${ep.title}`"
                    @click.stop="$emit('open-subtitles', ep.id, `${item.title} - ${ep.title}`)"
                  >
                    <Subtitles class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Film, Play, Subtitles, Layers, ChevronDown } from 'lucide-vue-next';
import type { LibraryMediaItem } from './types';
import { formatBytes, formatMediaType } from '../../lib/formatters';

const props = defineProps<{
  item: LibraryMediaItem;
  selected: boolean;
  isOwned: boolean;
}>();

defineEmits<{
  (e: 'toggle-select', id: string): void;
  (e: 'open-details', item: LibraryMediaItem): void;
  (e: 'open-subtitles', id: string, title: string): void;
  (e: 'open-episodes', item: LibraryMediaItem, reqId?: string): void;
}>();

const expanded = ref(false);

const totalEpisodes = computed(() => {
  if (!props.item.seasons) return 0;
  return props.item.seasons.reduce((acc, s) => acc + s.episodeCount, 0);
});

const coRequestersTooltip = computed(() => {
  if (!props.item.coRequesters || props.item.coRequesters.length === 0) return '';
  return `Co-requesters: ${props.item.coRequesters.map((u) => `@${u.username}`).join(', ')}`;
});
</script>
