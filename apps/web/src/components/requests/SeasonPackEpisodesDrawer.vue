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
          <tr
            v-for="ep in episodes"
            :key="ep.id"
            :data-testid="`episode-row-${ep.id}`"
            class="hover:bg-zinc-800/30 transition"
            :class="{ 'opacity-60': ep.status === 'pruned' }"
          >
            <!-- Episode Code -->
            <td class="py-2.5 px-3 font-mono font-medium text-white whitespace-nowrap">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700/60">
                S{{ pad(ep.seasonNumber) }}E{{ pad(ep.episodeNumber) }}
              </span>
            </td>

            <!-- File Name / Relative Path -->
            <td
              class="py-2.5 px-3 max-w-[220px] truncate"
              :title="ep.relativePath"
            >
              {{ formatEpisodeName(ep.relativePath) }}
            </td>

            <!-- Size -->
            <td class="py-2.5 px-3 text-zinc-400 whitespace-nowrap font-mono">
              {{ formatBytes(ep.sizeBytes) }}
            </td>

            <!-- Play History -->
            <td class="py-2.5 px-3 whitespace-nowrap">
              <span
                v-if="ep.lastPlayedAt"
                class="inline-flex items-center gap-1 text-emerald-400 font-medium"
              >
                <svg
                  class="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span>Watched {{ formatDate(ep.lastPlayedAt) }}</span>
              </span>
              <span
                v-else
                class="text-zinc-500"
              >
                Unwatched
              </span>
            </td>

            <!-- Status Badge -->
            <td class="py-2.5 px-3 text-center whitespace-nowrap">
              <span
                v-if="ep.status === 'pruned'"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700/60"
              >
                Pruned
              </span>
              <span
                v-else
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/80"
              >
                Downloaded
              </span>
            </td>

            <!-- Keep Toggle -->
            <td class="py-2.5 px-3 text-center whitespace-nowrap">
              <button
                type="button"
                :data-testid="`toggle-keep-ep-${ep.id}`"
                :disabled="!canManage || ep.status === 'pruned' || togglingKeepId === ep.id"
                class="p-1 rounded-md border transition cursor-pointer disabled:opacity-40"
                :class="ep.keepFlag
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'"
                :title="ep.keepFlag ? 'Episode protected from cleanup' : 'Mark episode Keep to protect from pruning'"
                @click="toggleKeep(ep)"
              >
                <svg
                  class="w-3.5 h-3.5"
                  :fill="ep.keepFlag ? 'currentColor' : 'none'"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            </td>

            <!-- Actions (Prune) -->
            <td class="py-2.5 px-3 text-right whitespace-nowrap">
              <button
                v-if="ep.status !== 'pruned'"
                type="button"
                :data-testid="`prune-ep-${ep.id}`"
                :disabled="!canManage || pruningId === ep.id"
                class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-400 bg-red-950/30 hover:bg-red-950/60 border border-red-800/50 rounded-md transition cursor-pointer disabled:opacity-40"
                title="Prune Episode (remove files and set priority 0)"
                @click="promptPrune(ep)"
              >
                <svg
                  class="w-3 h-3"
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
                <span>Prune</span>
              </button>
              <span
                v-else
                class="text-[11px] text-zinc-500 italic"
              >
                Pruned
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Confirm Prune Modal / Prompt -->
    <div
      v-if="confirmPruneEpisode"
      data-testid="confirm-prune-modal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">
              Prune Episode S{{ pad(confirmPruneEpisode.seasonNumber) }}E{{ pad(confirmPruneEpisode.episodeNumber) }}?
            </h3>
            <p class="text-xs text-zinc-400 mt-0.5">
              This will set priority to 0 in qBittorrent and delete both hardlinked files. Unwatched episodes continue seeding.
            </p>
          </div>
        </div>

        <div class="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-xs space-y-1 font-mono text-zinc-400">
          <div><span class="text-zinc-500">File:</span> {{ confirmPruneEpisode.relativePath }}</div>
          <div><span class="text-zinc-500">Reclaimed Space:</span> {{ formatBytes(confirmPruneEpisode.sizeBytes) }}</div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            data-testid="cancel-prune-btn"
            class="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition cursor-pointer"
            @click="confirmPruneEpisode = null"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="execute-prune-btn"
            :disabled="pruningId === confirmPruneEpisode.id"
            class="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition cursor-pointer disabled:opacity-50"
            @click="executePrune"
          >
            {{ pruningId === confirmPruneEpisode.id ? 'Pruning...' : 'Confirm Prune' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '../../lib/api';
import { formatBytes, formatDate } from '../../lib/formatters';

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

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatEpisodeName(relPath: string): string {
  const parts = relPath.split(/[/\\]/);
  return parts[parts.length - 1] || relPath;
}

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
