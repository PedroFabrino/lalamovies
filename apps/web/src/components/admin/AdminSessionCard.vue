<script setup lang="ts">
import { ref } from 'vue';
import type { PlaybackSession } from '../../composables/useAdminActivity';

defineProps<{
  session: PlaybackSession;
}>();

const emit = defineEmits<{
  (e: 'stop', session: PlaybackSession): void;
}>();

const showDiagnostics = ref(false);

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
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition space-y-4">
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
        @click="emit('stop', session)"
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

    <!-- Diagnostic Drawer Toggle -->
    <div class="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
      <button
        type="button"
        class="text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
        @click="showDiagnostics = !showDiagnostics"
      >
        <svg
          class="w-3.5 h-3.5 transition-transform duration-200"
          :class="{ 'rotate-90': showDiagnostics }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span>{{ showDiagnostics ? 'Hide Transcode Diagnostics' : 'Transcode Diagnostics' }}</span>
      </button>
      <span
        v-if="session.transcodingInfo?.framerate"
        class="text-xs font-mono text-zinc-500"
      >
        {{ Math.round(session.transcodingInfo.framerate) }} FPS
      </span>
    </div>

    <!-- Diagnostic Drawer Content -->
    <div
      v-if="showDiagnostics"
      class="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 text-xs space-y-3"
    >
      <!-- Transcoding Info Present -->
      <div
        v-if="session.transcodingInfo"
        class="space-y-2.5"
      >
        <!-- Reasons pills -->
        <div v-if="session.transcodingInfo.transcodeReasons && session.transcodingInfo.transcodeReasons.length > 0">
          <span class="text-zinc-400 block mb-1 font-medium">Transcode Reasons:</span>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="reason in session.transcodingInfo.transcodeReasons"
              :key="reason"
              class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-mono"
            >
              {{ reason }}
            </span>
          </div>
        </div>

        <!-- Grid of Stream Details -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
          <div class="bg-zinc-900/80 p-2 rounded border border-zinc-800">
            <span class="text-zinc-500 block text-[10px] uppercase font-sans">Video</span>
            <span class="text-zinc-200 font-semibold">
              {{ session.transcodingInfo.videoCodec || 'Direct' }}
              <span
                v-if="session.transcodingInfo.isVideoDirect"
                class="text-emerald-400 font-sans text-[10px]"
              >(Direct)</span>
              <span
                v-else
                class="text-amber-400 font-sans text-[10px]"
              >(Transcode)</span>
            </span>
          </div>
          <div class="bg-zinc-900/80 p-2 rounded border border-zinc-800">
            <span class="text-zinc-500 block text-[10px] uppercase font-sans">Audio</span>
            <span class="text-zinc-200 font-semibold">
              {{ session.transcodingInfo.audioCodec || 'Direct' }}
              <span
                v-if="session.transcodingInfo.isAudioDirect"
                class="text-emerald-400 font-sans text-[10px]"
              >(Direct)</span>
              <span
                v-else
                class="text-amber-400 font-sans text-[10px]"
              >(Transcode)</span>
            </span>
          </div>
          <div class="bg-zinc-900/80 p-2 rounded border border-zinc-800">
            <span class="text-zinc-500 block text-[10px] uppercase font-sans">Container / Accel</span>
            <span class="text-zinc-200 font-semibold">
              {{ session.transcodingInfo.container || 'Direct' }}
              <span
                v-if="session.transcodingInfo.hardwareAccelerationType"
                class="text-purple-400 font-sans text-[10px]"
              >
                ({{ session.transcodingInfo.hardwareAccelerationType }})
              </span>
            </span>
          </div>
          <div class="bg-zinc-900/80 p-2 rounded border border-zinc-800">
            <span class="text-zinc-500 block text-[10px] uppercase font-sans">Channels / FPS</span>
            <span class="text-zinc-200 font-semibold">
              {{ session.transcodingInfo.audioChannels ? `${session.transcodingInfo.audioChannels} ch` : '-' }}
              <span
                v-if="session.transcodingInfo.framerate"
                class="text-zinc-400"
              >
                • {{ Math.round(session.transcodingInfo.framerate) }} fps
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- Direct Play without transcode info -->
      <div
        v-else
        class="text-zinc-400 py-1 flex items-center gap-2"
      >
        <svg
          class="w-4 h-4 text-emerald-400 shrink-0"
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
        <span>Direct Play active. Media is streaming in original format without transcoding overhead.</span>
      </div>
    </div>
  </div>
</template>
