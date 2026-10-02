<template>
  <div
    v-if="open && party"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    data-testid="watch-party-lobby-modal"
  >
    <div
      class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-2xl">🎉</span>
          <div class="min-w-0">
            <h3 class="text-lg font-bold text-white tracking-tight truncate">
              {{ party.jellyfinGroupName }}
            </h3>
            <p class="text-xs text-zinc-400">
              Host: <span class="text-zinc-200 font-semibold">{{ party.hostUsername }}</span>
              •
              <span class="text-purple-300 font-medium">
                {{ party.controlMode === 'host_only' ? '👑 Host Only' : '👥 Democratic' }}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          class="text-zinc-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="space-y-4 overflow-y-auto flex-1 pr-1">
        <!-- Now Playing Card -->
        <div class="bg-zinc-950/70 border border-purple-900/40 rounded-xl p-4 flex gap-4">
          <img
            v-if="party.posterUrl"
            :src="party.posterUrl"
            :alt="party.title"
            class="w-16 h-24 object-cover rounded-lg shrink-0 border border-zinc-800"
          >
          <div
            v-else
            class="w-16 h-24 bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-600 shrink-0 border border-zinc-800"
          >
            🎬
          </div>

          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/60">
                Now Playing
              </span>
              <h4
                class="font-bold text-white text-base truncate mt-1"
                :title="party.title"
              >
                {{ party.title }}
              </h4>
              <p class="text-xs text-zinc-400 mt-0.5">
                <span v-if="party.seasonNumber && party.episodeNumber">
                  Season {{ party.seasonNumber }}, Episode {{ party.episodeNumber }}
                </span>
                <span v-else-if="party.year">
                  {{ party.year }}
                </span>
              </p>
            </div>

            <div class="pt-2 flex flex-wrap gap-2">
              <a
                :href="getJellyfinLaunchUrl(party)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer"
                data-testid="lobby-launch-btn"
              >
                <span>Launch in Jellyfin</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Watching on TV / AirPlay Section (#216) -->
        <div
          class="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-2"
          data-testid="lobby-tv-guidance"
        >
          <div class="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <span>📺</span>
            <span>Watching on Apple TV or Smart TV?</span>
          </div>
          <p class="text-[11px] text-zinc-400 leading-relaxed">
            TV apps (like Swiftfin) don't support SyncPlay rooms. To sync playback with friends on your big screen, open the web player below and AirPlay or Cast it to your TV.
          </p>
          <div>
            <a
              :href="getJellyfinLaunchUrl(party)"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-zinc-700 transition"
              data-testid="lobby-tv-airplay-btn"
            >
              <span>📡</span>
              <span>Open Web & AirPlay to TV</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        <!-- Host Controls -->
        <div
          v-if="isHost"
          class="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-3.5 space-y-3"
          data-testid="host-controls"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <span>👑</span> Host Controls
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- 1-Click Play Next Episode for TV shows / Anime -->
            <button
              v-if="isSeries"
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              :disabled="switching"
              data-testid="play-next-episode-btn"
              @click="handlePlayNextEpisode"
            >
              <span>⏭️</span>
              <span>Play Next Episode (E{{ (party.episodeNumber ?? 0) + 1 }})</span>
            </button>

            <!-- Change Media modal trigger -->
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer flex items-center gap-1.5 border border-zinc-700"
              data-testid="change-media-btn"
              @click="showChangeMediaPrompt = true"
            >
              <span>🔄</span>
              <span>Change Media</span>
            </button>
          </div>

          <!-- Change Media Inline Input Form -->
          <div
            v-if="showChangeMediaPrompt"
            class="pt-2 border-t border-zinc-800/80 space-y-2 animate-in fade-in duration-100"
          >
            <div class="text-xs text-zinc-300 font-medium">
              Switch to new media item:
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                v-model="changeMediaTitle"
                type="text"
                placeholder="Media Title (e.g. Princess Mononoke)"
                class="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              >
              <input
                v-model="changeMediaItemId"
                type="text"
                placeholder="Jellyfin Item ID"
                class="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              >
            </div>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                @click="showChangeMediaPrompt = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-3 py-1 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
                :disabled="!changeMediaTitle.trim() || !changeMediaItemId.trim() || switching"
                @click="handleManualChangeMedia"
              >
                Switch
              </button>
            </div>
          </div>
        </div>

        <!-- Party Timeline History -->
        <div class="space-y-2">
          <div class="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Party Timeline
          </div>
          <div
            v-if="timelineHistory.length === 0"
            class="text-xs text-zinc-500 italic bg-zinc-950/40 p-3 rounded-xl border border-zinc-850"
          >
            No prior titles watched yet. This is the first item on the marathon!
          </div>
          <div
            v-else
            class="space-y-1.5"
          >
            <div
              v-for="(item, idx) in timelineHistory"
              :key="idx"
              class="flex items-center justify-between text-xs bg-zinc-950/60 border border-zinc-800/80 px-3 py-2 rounded-xl"
            >
              <div class="flex items-center gap-2 truncate">
                <span class="text-emerald-400">✅</span>
                <span class="font-medium text-zinc-200 truncate">{{ item.title }}</span>
                <span
                  v-if="item.seasonNumber && item.episodeNumber"
                  class="text-zinc-400"
                >
                  (S{{ String(item.seasonNumber).padStart(2, '0') }}E{{ String(item.episodeNumber).padStart(2, '0') }})
                </span>
              </div>
              <span class="text-[10px] text-zinc-500 shrink-0">
                {{ formatTime(item.completedAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end shrink-0 pt-2 border-t border-zinc-800/60">
        <button
          type="button"
          class="px-4 py-2 text-sm text-zinc-400 hover:text-white transition cursor-pointer"
          @click="emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { WatchParty } from './ActiveWatchPartiesShelf.vue';

interface HistoryItem {
  title: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  year?: number | null;
  completedAt: string;
}

const props = defineProps<{
  open: boolean;
  party: (WatchParty & { historyJson?: string }) | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'mediaSwitched', party: WatchParty): void;
}>();

const authStore = useAuthStore();
const switching = ref(false);
const showChangeMediaPrompt = ref(false);
const changeMediaTitle = ref('');
const changeMediaItemId = ref('');

const isHost = computed(() => {
  if (!props.party || !authStore.user) return false;
  return props.party.hostUserId === authStore.user.id;
});

const isSeries = computed(() => {
  if (!props.party) return false;
  return (
    props.party.mediaType === 'tv_show' ||
    props.party.mediaType === 'anime' ||
    props.party.episodeNumber !== null && props.party.episodeNumber !== undefined
  );
});

const timelineHistory = computed<HistoryItem[]>(() => {
  if (!props.party?.historyJson) return [];
  try {
    return JSON.parse(props.party.historyJson);
  } catch {
    return [];
  }
});

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

async function handlePlayNextEpisode() {
  if (!props.party) return;
  switching.value = true;
  const nextEpisode = (props.party.episodeNumber ?? 0) + 1;

  try {
    const res = await api.post<{ watchParty: WatchParty }>(`/watch-parties/${props.party.id}/switch-media`, {
      jellyfinItemId: props.party.jellyfinItemId, // reuses stream/series item id or next episode id
      title: props.party.title,
      mediaType: props.party.mediaType,
      seasonNumber: props.party.seasonNumber ?? 1,
      episodeNumber: nextEpisode,
      posterUrl: props.party.posterUrl,
    });
    emit('mediaSwitched', res.watchParty);
  } catch {
    // Non-fatal
  } finally {
    switching.value = false;
  }
}

async function handleManualChangeMedia() {
  if (!props.party || !changeMediaTitle.value.trim() || !changeMediaItemId.value.trim()) return;
  switching.value = true;

  try {
    const res = await api.post<{ watchParty: WatchParty }>(`/watch-parties/${props.party.id}/switch-media`, {
      jellyfinItemId: changeMediaItemId.value.trim(),
      title: changeMediaTitle.value.trim(),
      mediaType: 'movie',
    });
    showChangeMediaPrompt.value = false;
    changeMediaTitle.value = '';
    changeMediaItemId.value = '';
    emit('mediaSwitched', res.watchParty);
  } catch {
    // Non-fatal
  } finally {
    switching.value = false;
  }
}

function getJellyfinLaunchUrl(party: WatchParty): string {
  if (party.jellyfinWebUrl) {
    return party.jellyfinWebUrl;
  }
  const base = 'https://watch.lalamovies.stream';
  return party.jellyfinItemId ? `${base}/web/index.html#!/details?id=${party.jellyfinItemId}` : base;
}
</script>
