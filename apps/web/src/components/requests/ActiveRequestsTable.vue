<template>
  <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <th class="py-3.5 px-4 sm:px-6">
              Media
            </th>
            <th class="py-3.5 px-4">
              Type
            </th>
            <th class="py-3.5 px-4">
              Status
            </th>
            <th class="py-3.5 px-4 min-w-[200px]">
              Progress / Details
            </th>
            <th
              v-if="isAdmin"
              class="py-3.5 px-4"
            >
              Requester
            </th>
            <th class="py-3.5 px-4">
              Requested
            </th>
            <th class="py-3.5 px-4 text-center">
              Keep
            </th>
            <th class="py-3.5 px-4 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-800/70 text-zinc-200">
          <template
            v-for="item in requests"
            :key="item.id"
          >
            <tr class="hover:bg-zinc-800/30 transition group">
              <!-- Title & Metadata -->
              <td class="py-4 px-4 sm:px-6">
                <div class="font-medium text-white text-base">
                  {{ item.title }}
                </div>
                <div class="text-xs text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span v-if="formatMediaSubtitle(item)">{{ formatMediaSubtitle(item) }}</span>
                  <span
                    v-if="item.scheduledDeleteAt"
                    class="text-amber-400 font-medium"
                  >
                    (Auto-delete scheduled: {{ formatDate(item.scheduledDeleteAt) }})
                  </span>
                  <button
                    v-if="isSeasonPack(item)"
                    type="button"
                    data-testid="toggle-season-pack-episodes"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-indigo-300 border border-zinc-700/60 transition cursor-pointer"
                    @click="toggleEpisodes(item.id)"
                  >
                    <span>Episodes</span>
                    <svg
                      class="w-3 h-3 transition-transform"
                      :class="{ 'rotate-180': expandedEpisodesId === item.id }"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </td>

              <!-- Media Type Badge -->
              <td class="py-4 px-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  {{ formatMediaType(item.mediaType) }}
                </span>
              </td>

              <!-- Status Badge -->
              <td class="py-4 px-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                  :class="getStatusBadgeClass(item)"
                >
                  <span
                    v-if="item.status === 'downloading'"
                    class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"
                  />
                  {{ formatStatusLabel(item) }}
                </span>
              </td>

              <!-- Progress Bar & Speed / ETA -->
              <td class="py-4 px-4">
                <RequestProgressCell :item="item" />
              </td>

              <!-- Requester (Admin View) -->
              <td
                v-if="isAdmin"
                class="py-4 px-4 text-xs text-zinc-400"
              >
                <div
                  v-if="item.coRequesters && item.coRequesters.length > 0"
                  data-testid="admin-requester-group"
                  class="flex items-center gap-1.5 flex-wrap"
                >
                  <span
                    class="font-medium text-zinc-200"
                    title="Primary requester"
                  >
                    {{ item.requesterUsername || item.userId.slice(0, 8) }}
                  </span>
                  <span class="text-zinc-500 text-[11px] font-normal">+</span>
                  <span
                    v-for="coReq in item.coRequesters"
                    :key="coReq"
                    data-testid="co-requester-badge"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 text-[11px]"
                    :title="`${coReq} (co-requester)`"
                  >
                    <span>{{ coReq }}</span>
                    <span class="text-[9px] uppercase tracking-wider text-indigo-400 font-semibold">(co-req)</span>
                  </span>
                </div>
                <span
                  v-else
                  class="whitespace-nowrap"
                >
                  {{ item.requesterUsername || item.userId.slice(0, 8) }}
                </span>
              </td>

              <!-- Requested Date -->
              <td class="py-4 px-4 whitespace-nowrap text-xs text-zinc-400">
                {{ formatDate(item.requestedAt) }}
              </td>

              <!-- Keep Flag Toggle (Admin Only) -->
              <td class="py-4 px-4 whitespace-nowrap text-center">
                <button
                  v-if="isAdmin"
                  type="button"
                  class="p-1.5 rounded-lg border transition cursor-pointer disabled:opacity-50"
                  :class="item.keepFlag
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'"
                  :title="item.keepFlag ? 'Item marked Keep (immune to auto-cleanup)' : 'Enable Keep flag to protect from auto-cleanup'"
                  @click="$emit('toggleKeep', item)"
                >
                  <svg
                    class="w-4 h-4"
                    :fill="item.keepFlag ? 'currentColor' : 'none'"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </button>
                <span
                  v-else-if="item.keepFlag"
                  class="text-amber-400 text-xs font-medium"
                >
                  Yes
                </span>
                <span
                  v-else
                  class="text-zinc-600 text-xs"
                >
                  No
                </span>
              </td>

              <!-- Actions (Retry & Delete) -->
              <td class="py-4 px-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="item.status === 'seeding' || item.status === 'done'"
                    type="button"
                    data-testid="open-subtitles-btn"
                    class="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-950/40 rounded-lg transition cursor-pointer"
                    title="Manage Subtitles (pt-BR)"
                    @click="$emit('openSubtitles', item)"
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
                        d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </button>

                  <button
                    v-if="canReplaceTorrent(item)"
                    type="button"
                    data-testid="replace-torrent-btn"
                    class="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                    title="Replace Torrent"
                    @click="$emit('replaceTorrent', item)"
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
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </button>

                  <button
                    v-if="isAdmin && item.status === 'error'"
                    type="button"
                    :disabled="retryingId === item.id"
                    class="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-950/40 rounded-lg transition cursor-pointer disabled:opacity-50"
                    title="Retry processing / refresh Jellyfin"
                    @click="$emit('retry', item)"
                  >
                    <svg
                      class="w-4 h-4"
                      :class="{ 'animate-spin': retryingId === item.id }"
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
                  </button>

                  <button
                    v-if="canDelete(item)"
                    type="button"
                    class="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                    title="Delete Request"
                    @click="$emit('delete', item)"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

            <tr
              v-if="expandedEpisodesId === item.id"
              class="bg-zinc-950/60"
            >
              <td
                :colspan="isAdmin ? 8 : 7"
                class="p-3 sm:px-6"
              >
                <SeasonPackEpisodesDrawer
                  :request-id="item.id"
                  :media-title="item.title"
                  :is-admin="isAdmin"
                  :is-primary="item.userId === currentUserId"
                  @episode-pruned="(payload) => handleEpisodePruned(item, payload)"
                  @close="expandedEpisodesId = null"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DownloadRequest } from '../../stores/requests';
import {
  formatMediaType,
  formatDate,
  formatMediaSubtitle,
  formatStatusLabel,
  getStatusBadgeClass,
} from '../../lib/formatters';
import RequestProgressCell from './RequestProgressCell.vue';
import SeasonPackEpisodesDrawer from './SeasonPackEpisodesDrawer.vue';

const props = defineProps<{
  requests: DownloadRequest[];
  isAdmin: boolean;
  currentUserId?: string;
  retryingId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'toggleKeep', item: DownloadRequest): void;
  (e: 'openSubtitles', item: DownloadRequest): void;
  (e: 'replaceTorrent', item: DownloadRequest): void;
  (e: 'retry', item: DownloadRequest): void;
  (e: 'delete', item: DownloadRequest): void;
  (e: 'episodePruned', item: DownloadRequest, payload: { episodeId: string; wholeRequestDeleted: boolean }): void;
}>();

const expandedEpisodesId = ref<string | null>(null);

function isSeasonPack(item: DownloadRequest): boolean {
  return (
    (item.mediaType === 'tv_show' || item.mediaType === 'anime') &&
    item.seasonNumber !== null &&
    item.seasonNumber !== undefined &&
    (item.episodeNumber === null || item.episodeNumber === undefined)
  );
}

function toggleEpisodes(requestId: string): void {
  expandedEpisodesId.value = expandedEpisodesId.value === requestId ? null : requestId;
}

function handleEpisodePruned(
  item: DownloadRequest,
  payload: { episodeId: string; wholeRequestDeleted: boolean }
): void {
  emit('episodePruned', item, payload);
  if (payload.wholeRequestDeleted) {
    expandedEpisodesId.value = null;
    emit('delete', item);
  }
}

function canDelete(item: DownloadRequest): boolean {
  if (props.isAdmin) return true;
  if (item.isPrimaryRequester === false) return false;
  return item.userId === props.currentUserId;
}

function canReplaceTorrent(item: DownloadRequest): boolean {
  if (!['downloading', 'queued', 'error'].includes(item.status)) return false;
  return props.isAdmin || item.userId === props.currentUserId;
}
</script>
