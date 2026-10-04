<script setup lang="ts">
import { ref } from 'vue';
import type { PlaybackSession } from '../../composables/useAdminActivity';

defineProps<{
  sessions: PlaybackSession[];
  isLoading: boolean;
  isStoppingSession?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'stop-session', payload: { sessionId: string; message?: string }): void;
}>();

const sessionToStop = ref<PlaybackSession | null>(null);
const stopMessage = ref('');

function openStopModal(session: PlaybackSession) {
  sessionToStop.value = session;
  stopMessage.value = '';
}

function closeStopModal() {
  sessionToStop.value = null;
  stopMessage.value = '';
}

function handleConfirmStop() {
  if (!sessionToStop.value) return;
  emit('stop-session', {
    sessionId: sessionToStop.value.id,
    message: stopMessage.value.trim() || undefined,
  });
  closeStopModal();
}

function formatTicks(ticks?: number): string {
  if (!ticks || ticks <= 0) return '0:00';
  const totalSeconds = Math.floor(ticks / 10000000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function calculateProgress(session: PlaybackSession): number {
  const current = session.playState?.positionTicks || 0;
  const total = session.nowPlayingItem?.runTimeTicks || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

function formatBitrate(bps?: number): string {
  if (!bps || bps <= 0) return '';
  const mbps = (bps / 1000000).toFixed(1);
  return `${mbps} Mbps`;
}

function getMediaTitle(session: PlaybackSession): string {
  const item = session.nowPlayingItem;
  if (!item) return 'Unknown Media';
  if (item.seriesName) {
    return item.seriesName;
  }
  if (item.productionYear) {
    return `${item.name} (${item.productionYear})`;
  }
  return item.name;
}

function getMediaSubtitle(session: PlaybackSession): string | null {
  const item = session.nowPlayingItem;
  if (!item) return null;
  if (item.seriesName) {
    const s = item.seasonIndex !== undefined ? `S${item.seasonIndex.toString().padStart(2, '0')}` : '';
    const e = item.episodeIndex !== undefined ? `E${item.episodeIndex.toString().padStart(2, '0')}` : '';
    const code = s && e ? `${s}${e}` : s || e;
    return code ? `${code} - ${item.name}` : item.name;
  }
  return null;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div>
        <h2 class="text-lg font-semibold text-white flex items-center gap-2">
          <span>Active Playback Sessions</span>
          <span
            v-if="sessions.length > 0"
            class="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
          >
            {{ sessions.length }}
          </span>
        </h2>
        <p class="text-sm text-zinc-400 mt-1">
          Real-time monitoring of users streaming media from Jellyfin.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          :disabled="isLoading"
          class="px-3.5 py-2 text-sm font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          @click="emit('refresh')"
        >
          <svg
            class="w-4 h-4"
            :class="{ 'animate-spin': isLoading }"
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
          <span>{{ isLoading ? 'Refreshing...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 text-sm text-rose-300 flex items-center gap-3"
    >
      <svg
        class="w-5 h-5 text-rose-400 shrink-0"
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
      <span>{{ error }}</span>
    </div>

    <!-- Empty State -->
    <div
      v-if="!isLoading && sessions.length === 0"
      class="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-12 text-center"
    >
      <div class="w-12 h-12 mx-auto rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-500 mb-3">
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 class="text-base font-medium text-white">
        No active playback sessions
      </h3>
      <p class="text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
        Server is idle. When users stream movies or shows, live progress and playback method appear here.
      </p>
    </div>

    <!-- Session Cards List -->
    <div
      v-else
      class="grid grid-cols-1 gap-4"
    >
      <div
        v-for="session in sessions"
        :key="session.id"
        class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition space-y-4"
      >
        <!-- Top Row: User & Device / Action -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <!-- User Avatar Fallback -->
            <div class="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
              {{ session.userName.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-white truncate">
                  {{ session.userName }}
                </span>
                <!-- Play Method Badge -->
                <span
                  v-if="session.playMethod === 'DirectPlay'"
                  class="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/70"
                >
                  Direct Play
                </span>
                <span
                  v-else-if="session.playMethod === 'DirectStream'"
                  class="px-2 py-0.5 text-xs font-semibold rounded bg-sky-950/70 text-sky-400 border border-sky-800/70"
                >
                  Direct Stream
                </span>
                <span
                  v-else-if="session.isHardwareAccelerated"
                  class="px-2 py-0.5 text-xs font-semibold rounded bg-purple-950/70 text-purple-400 border border-purple-800/70"
                >
                  NVENC Transcode
                </span>
                <span
                  v-else
                  class="px-2 py-0.5 text-xs font-semibold rounded bg-rose-950/70 text-rose-400 border border-rose-800/70"
                >
                  CPU Transcode
                </span>
              </div>
              <p class="text-xs text-zinc-400 mt-0.5 truncate">
                {{ session.deviceName }} • {{ session.client }}
                <span
                  v-if="formatBitrate(session.bandwidthBps)"
                  class="text-zinc-500"
                >
                  ({{ formatBitrate(session.bandwidthBps) }})
                </span>
              </p>
            </div>
          </div>

          <!-- Stop Stream Button -->
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition shrink-0 cursor-pointer"
            @click="openStopModal(session)"
          >
            Stop Stream
          </button>
        </div>

        <!-- Middle: Media Details -->
        <div class="flex items-center gap-4 bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-3">
          <div class="w-12 h-16 bg-zinc-800 rounded flex items-center justify-center text-zinc-500 shrink-0">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-medium text-white truncate">
              {{ getMediaTitle(session) }}
            </h4>
            <p
              v-if="getMediaSubtitle(session)"
              class="text-xs text-zinc-400 mt-0.5 truncate"
            >
              {{ getMediaSubtitle(session) }}
            </p>
            <div class="flex items-center gap-2 mt-2">
              <span
                v-if="session.playState?.isPaused"
                class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
              >
                Paused
              </span>
              <span
                v-else
                class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              >
                Playing
              </span>
            </div>
          </div>
        </div>

        <!-- Timeline / Progress -->
        <div class="space-y-1.5">
          <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              class="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${calculateProgress(session)}%` }"
            />
          </div>
          <div class="flex justify-between text-xs text-zinc-400 font-mono">
            <span>{{ formatTicks(session.playState?.positionTicks) }}</span>
            <span>{{ formatTicks(session.nowPlayingItem?.runTimeTicks) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Stop Confirmation Modal -->
    <div
      v-if="sessionToStop"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div>
          <h3 class="text-lg font-bold text-white">
            Stop Playback Session
          </h3>
          <p class="text-sm text-zinc-400 mt-1">
            Are you sure you want to stop the stream for
            <span class="text-white font-medium">{{ sessionToStop.userName }}</span>
            on
            <span class="text-white font-medium">{{ sessionToStop.deviceName }}</span>?
          </p>
        </div>

        <div>
          <label class="block text-xs font-medium text-zinc-300 mb-1.5">
            Client Notification Message (optional)
          </label>
          <input
            v-model="stopMessage"
            type="text"
            placeholder="e.g. Server maintenance in progress..."
            class="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
          >
          <p class="text-[11px] text-zinc-500 mt-1">
            If provided, an on-screen notice is broadcast to the viewer's screen before disconnecting.
          </p>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
            @click="closeStopModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
            @click="handleConfirmStop"
          >
            Confirm Stop
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
