<template>
  <div
    v-if="isTrusted && requests.length > 0"
    class="space-y-4 pt-6 border-t border-zinc-800"
  >
    <div class="flex items-center gap-2">
      <span class="text-xl">🔒</span>
      <h2 class="text-lg font-semibold text-white">
        Private Downloads
      </h2>
      <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        {{ requests.length }}
      </span>
    </div>

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
              <th class="py-3.5 px-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/70 text-zinc-200">
            <tr
              v-for="item in requests"
              :key="item.id"
              class="hover:bg-zinc-800/30 transition group"
            >
              <!-- Title & Metadata -->
              <td class="py-4 px-4 sm:px-6">
                <div class="font-medium text-white text-base">
                  {{ item.title }}
                </div>
                <div class="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                  <span v-if="formatMediaSubtitle(item)">{{ formatMediaSubtitle(item) }}</span>
                  <span
                    v-if="item.scheduledDeleteAt"
                    class="text-amber-400 font-medium"
                  >
                    (Auto-delete scheduled: {{ formatDate(item.scheduledDeleteAt) }})
                  </span>
                </div>
              </td>

              <!-- Media Type Badge -->
              <td class="py-4 px-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-950/60 text-purple-300 border border-purple-800">
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
                <div
                  v-if="item.status === 'downloading'"
                  class="space-y-1.5"
                >
                  <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${getProgressPercent(item.id)}%` }"
                    />
                  </div>
                  <div class="flex justify-between items-center text-[11px] text-zinc-400 font-mono">
                    <span>{{ getProgressPercent(item.id) }}%</span>
                    <span>{{ getProgressSpeedEta(item.id) }}</span>
                  </div>
                </div>

                <div
                  v-else-if="item.status === 'queued'"
                  class="text-xs flex items-center gap-1.5"
                  :class="item.deferredReason === 'waiting_for_space' ? 'text-amber-400/90' : 'text-blue-400/90'"
                >
                  <span>
                    {{ item.deferredReason === 'waiting_for_space' ? 'Waiting for storage quota headroom' : 'Waiting for available download slot' }}
                  </span>
                </div>

                <div
                  v-else-if="item.status === 'error'"
                  class="text-xs text-red-400 max-w-xs truncate"
                  :title="item.errorMessage || 'Unknown error occurred'"
                >
                  {{ item.errorMessage || 'Download error' }}
                </div>

                <div
                  v-else-if="item.status === 'seeding' || item.status === 'done'"
                  class="space-y-1.5"
                >
                  <div class="text-xs text-emerald-400/90 flex items-center gap-1">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>In Jellyfin private library</span>
                  </div>

                  <!-- Subtitle status badge -->
                  <div
                    v-if="item.transcriptionStatus && item.transcriptionStatus !== 'none'"
                    class="flex items-center"
                  >
                    <span
                      v-if="item.transcriptionStatus === 'pending'"
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/60 border border-amber-800 text-amber-300"
                      title="Queued for off-peak transcription window"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>Pending Window</span>
                    </span>
                    <span
                      v-else-if="item.transcriptionStatus === 'transcribing'"
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-950/60 border border-indigo-800 text-indigo-300"
                    >
                      <svg
                        class="w-3 h-3 animate-spin"
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
                      <span>Transcribing...</span>
                    </span>
                    <span
                      v-else-if="item.transcriptionStatus === 'completed'"
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                    >
                      <svg
                        class="w-3 h-3 text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Subtitles Ready</span>
                    </span>
                    <span
                      v-else-if="item.transcriptionStatus === 'failed'"
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950/60 border border-rose-800 text-rose-300"
                      :title="item.transcriptionError || 'Transcription failed'"
                    >
                      <svg
                        class="w-3 h-3 text-rose-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Transcription Failed</span>
                    </span>
                  </div>
                </div>

                <div
                  v-else
                  class="text-xs text-zinc-500"
                >
                  —
                </div>
              </td>

              <!-- Requester (Admin View) -->
              <td
                v-if="isAdmin"
                class="py-4 px-4 text-xs text-zinc-400 whitespace-nowrap"
              >
                {{ item.requesterUsername || item.userId.slice(0, 8) }}
              </td>

              <!-- Requested Date -->
              <td class="py-4 px-4 whitespace-nowrap text-xs text-zinc-400">
                {{ formatDate(item.requestedAt) }}
              </td>

              <!-- Actions -->
              <td class="py-4 px-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="canTranscribe(item)"
                    type="button"
                    :disabled="transcribingId === item.id || item.transcriptionStatus === 'transcribing'"
                    class="px-2 py-1 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="item.transcriptionStatus === 'failed'
                      ? 'text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800'
                      : 'text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800'"
                    :title="item.transcriptionStatus === 'failed' ? 'Retry Subtitle Transcription' : 'Generate English Subtitles'"
                    @click="$emit('transcribe', item)"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      :class="{ 'animate-spin': transcribingId === item.id || item.transcriptionStatus === 'transcribing' }"
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
                    <span>{{ item.transcriptionStatus === 'failed' ? 'Retry Subtitles' : 'Generate Subtitles' }}</span>
                  </button>

                  <button
                    v-if="canReplaceTorrent(item)"
                    type="button"
                    data-testid="replace-private-torrent-btn"
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
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DownloadRequest, useRequestsStore } from '../../stores/requests';
import {
  formatSpeed,
  formatEta,
  formatMediaType,
  formatDate,
  formatMediaSubtitle,
  formatStatusLabel,
  getStatusBadgeClass,
} from '../../lib/formatters';

const props = defineProps<{
  requests: DownloadRequest[];
  isAdmin: boolean;
  isTrusted: boolean;
  currentUserId?: string;
  retryingId?: string | null;
  transcribingId?: string | null;
}>();

defineEmits<{
  (e: 'openSubtitles', item: DownloadRequest): void;
  (e: 'transcribe', item: DownloadRequest): void;
  (e: 'replaceTorrent', item: DownloadRequest): void;
  (e: 'retry', item: DownloadRequest): void;
  (e: 'delete', item: DownloadRequest): void;
}>();

const requestsStore = useRequestsStore();

function canDelete(item: DownloadRequest): boolean {
  if (props.isAdmin) return true;
  if (item.isPrimaryRequester === false) return false;
  return item.userId === props.currentUserId;
}

function canReplaceTorrent(item: DownloadRequest): boolean {
  if (!['downloading', 'queued', 'error'].includes(item.status)) return false;
  return props.isAdmin || item.userId === props.currentUserId;
}

function canTranscribe(item: DownloadRequest): boolean {
  if (item.mediaType !== 'private') return false;
  if (item.status !== 'seeding' && item.status !== 'done') return false;
  if (props.isAdmin) return true;
  if (props.isTrusted && item.userId === props.currentUserId) return true;
  return false;
}

function getProgressPercent(requestId: string): number {
  const p = requestsStore.progressMap[requestId];
  if (!p) return 0;
  return Math.min(100, Math.max(0, Math.round(p.progress * 100)));
}

function getProgressSpeedEta(requestId: string): string {
  const p = requestsStore.progressMap[requestId];
  if (!p) return '—';
  const speed = formatSpeed(p.speedBps);
  const eta = formatEta(p.etaSeconds);
  return `${speed} — ETA ${eta}`;
}
</script>
