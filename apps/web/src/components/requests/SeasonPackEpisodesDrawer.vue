<template>
  <div
    data-testid="season-pack-episodes-drawer"
    class="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-2xl space-y-4"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-zinc-800/80 pb-3">
      <div class="flex items-center gap-2.5">
        <div class="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
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
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-white flex items-center gap-2">
            <span>{{ mediaTitle ? `${mediaTitle} — Episodes` : 'Season Pack Episodes' }}</span>
            <span
              v-if="!loading"
              class="px-2 py-0.2 rounded-full text-xs font-normal bg-zinc-800 text-zinc-400"
            >
              {{ episodes.length }} episodes
            </span>
          </h4>
          <p class="text-xs text-zinc-400">
            Granular consumption tracking and selective qBittorrent file pruning
          </p>
        </div>
      </div>

      <button
        type="button"
        data-testid="close-episodes-drawer-btn"
        class="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
        title="Close Drawer"
        @click="$emit('close')"
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      data-testid="episodes-loading"
      class="py-8 text-center text-zinc-400 flex items-center justify-center gap-2 text-sm"
    >
      <svg
        class="w-4 h-4 animate-spin text-indigo-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span>Loading episode details...</span>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      data-testid="episodes-error"
      class="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-400 text-xs flex items-center justify-between"
    >
      <span>{{ error }}</span>
      <button
        type="button"
        class="underline hover:text-red-300"
        @click="fetchEpisodes"
      >
        Retry
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="episodes.length === 0"
      data-testid="episodes-empty"
      class="py-6 text-center text-zinc-500 text-xs"
    >
      No episode breakdown registered for this pack yet.
    </div>

    <!-- Episodes Table -->
    <div
      v-else
      class="overflow-x-auto border border-zinc-800/80 rounded-lg bg-zinc-900/40"
    >
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="border-b border-zinc-800/80 text-zinc-400 uppercase font-semibold text-[11px] bg-zinc-900/60">
            <th class="py-2.5 px-3">
              Episode
            </th>
            <th class="py-2.5 px-3">
              File / Title
            </th>
            <th class="py-2.5 px-3">
              Size
            </th>
            <th class="py-2.5 px-3">
              Play Status
            </th>
            <th class="py-2.5 px-3 text-center">
              Status
            </th>
            <th class="py-2.5 px-3 text-center">
              Keep
            </th>
            <th class="py-2.5 px-3 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-800/60 text-zinc-300">
          <EpisodeTableRow
            v-for="ep in episodes"
            :key="ep.id"
            :ep="ep"
            :can-manage="canManage"
            :is-toggling-keep="togglingKeepId === ep.id"
            :is-pruning="pruningId === ep.id"
            @toggle-keep="toggleKeep"
            @prompt-prune="promptPrune"
          />
        </tbody>
      </table>
    </div>

    <!-- Confirm Prune Modal / Prompt -->
    <PruneConfirmModal
      :episode="confirmPruneEpisode"
      :is-pruning="pruningId === confirmPruneEpisode?.id"
      @cancel="confirmPruneEpisode = null"
      @confirm="executePrune"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '../../lib/api';
import EpisodeTableRow from './EpisodeTableRow.vue';
import PruneConfirmModal from './PruneConfirmModal.vue';

export interface RequestEpisode {
  id: string;
  requestId: string;
  seasonNumber: number;
  episodeNumber: number;
  fileIndex: number;
  relativePath: string;
  jellyfinPath: string;
  sizeBytes: number;
  status: 'downloaded' | 'pruned';
  keepFlag: boolean;
  lastPlayedAt: string | null;
  prunedAt: string | null;
}

const props = defineProps<{
  requestId: string;
  mediaTitle?: string;
  isAdmin?: boolean;
  isPrimary?: boolean;
}>();

const emit = defineEmits<{
  (e: 'episodePruned', payload: { episodeId: string; wholeRequestDeleted: boolean }): void;
  (e: 'close'): void;
}>();

const episodes = ref<RequestEpisode[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const pruningId = ref<string | null>(null);
const togglingKeepId = ref<string | null>(null);
const confirmPruneEpisode = ref<RequestEpisode | null>(null);

const canManage = computed(() => props.isAdmin || props.isPrimary);

async function fetchEpisodes(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get<{ episodes: RequestEpisode[] }>(`/requests/${props.requestId}/episodes`);
    episodes.value = res.episodes;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to load episodes';
  } finally {
    loading.value = false;
  }
}

async function toggleKeep(ep: RequestEpisode): Promise<void> {
  togglingKeepId.value = ep.id;
  try {
    const res = await api.patch<{ episode: RequestEpisode }>(
      `/requests/${props.requestId}/episodes/${ep.id}/keep`
    );
    ep.keepFlag = res.episode.keepFlag;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to toggle keep flag';
  } finally {
    togglingKeepId.value = null;
  }
}

function promptPrune(ep: RequestEpisode): void {
  confirmPruneEpisode.value = ep;
}

async function executePrune(): Promise<void> {
  if (!confirmPruneEpisode.value) return;
  const ep = confirmPruneEpisode.value;
  pruningId.value = ep.id;

  try {
    const res = await api.delete<{
      ok: boolean;
      result: { success: boolean; freedBytes: number; wholeRequestDeleted: boolean };
    }>(`/requests/${props.requestId}/episodes/${ep.id}`);

    ep.status = 'pruned';
    confirmPruneEpisode.value = null;
    emit('episodePruned', {
      episodeId: ep.id,
      wholeRequestDeleted: res.result.wholeRequestDeleted,
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to prune episode';
  } finally {
    pruningId.value = null;
  }
}

onMounted(() => {
  fetchEpisodes();
});
</script>
