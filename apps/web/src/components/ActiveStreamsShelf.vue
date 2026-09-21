<template>
  <div v-if="streams.length > 0" class="mb-8 space-y-4" data-testid="active-streams-shelf">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">⏱️</span>
        <h2 class="text-lg font-bold text-white tracking-tight">Active Ephemeral Streams</h2>
        <span class="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-medium">
          {{ streams.length }}
        </span>
      </div>
      <button
        type="button"
        class="text-xs text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1"
        :disabled="loading"
        @click="fetchStreams"
      >
        <span :class="{ 'animate-spin': loading }">🔄</span>
        <span>Refresh</span>
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="stream in streams"
        :key="stream.id"
        class="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-lg hover:border-zinc-700 transition group"
        :data-testid="`stream-card-${stream.id}`"
      >
        <div>
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-semibold text-sm text-white line-clamp-2" :title="stream.title">
              {{ stream.title }}
            </h3>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border"
              :class="stream.status === 'ready'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                : 'bg-amber-950/70 text-amber-300 border-amber-800 animate-pulse'"
            >
              {{ stream.status === 'ready' ? 'Ready' : 'Mounting' }}
            </span>
          </div>

          <div class="flex items-center gap-2 text-xs text-zinc-400 mt-2">
            <span>⏳</span>
            <span :class="stream.timeRemainingSeconds < 3600 ? 'text-red-400 font-medium' : 'text-zinc-300'">
              {{ formatTtl(stream.timeRemainingSeconds) }}
            </span>
            <span class="text-zinc-600">•</span>
            <span class="text-[11px] text-zinc-500">24h cloud TTL</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-zinc-800/80 gap-2">
          <div class="flex items-center gap-2">
            <a
              v-if="stream.status === 'ready'"
              :href="getJellyfinUrl(stream)"
              target="_blank"
              rel="noopener noreferrer"
              class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
              data-testid="button-watch-stream"
            >
              <span>▶</span>
              <span>Watch</span>
            </a>
            <button
              type="button"
              class="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
              data-testid="button-promote-stream"
              @click="handlePromote(stream)"
            >
              <span>💾</span>
              <span>Promote</span>
            </button>
          </div>

          <button
            v-if="authStore.isAdmin"
            type="button"
            class="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
            title="Admin: Evict Stream immediately"
            data-testid="button-evict-stream"
            @click="handleEvict(stream)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth';

export interface EphemeralStreamItem {
  id: string;
  userId: string;
  debridTorrentId: string;
  magnetLink: string;
  title: string;
  status: 'pending' | 'ready' | 'expired' | 'promoted';
  expiresAt: string;
  jellyfinItemId?: string | null;
  jellyfinUrl?: string | null;
  timeRemainingSeconds: number;
}

const emit = defineEmits<{
  (e: 'promote', stream: { id: string; title: string }): void;
  (e: 'evicted', streamId: string): void;
}>();

const authStore = useAuthStore();
const streams = ref<EphemeralStreamItem[]>([]);
const loading = ref(false);

function formatTtl(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}

function getJellyfinUrl(stream: EphemeralStreamItem): string {
  if (stream.jellyfinUrl) {
    return stream.jellyfinUrl;
  }
  if (stream.jellyfinItemId) {
    return `/web/index.html#!/item?id=${stream.jellyfinItemId}`;
  }
  return '/web/index.html';
}

async function fetchStreams() {
  loading.value = true;
  try {
    const res = await api.get<{ streams: EphemeralStreamItem[] }>('/streams');
    streams.value = res.streams || [];
  } catch {
    // Non-blocking fallback
  } finally {
    loading.value = false;
  }
}

function handlePromote(stream: EphemeralStreamItem) {
  emit('promote', { id: stream.id, title: stream.title });
}

async function handleEvict(stream: EphemeralStreamItem) {
  if (!confirm(`Are you sure you want to evict "${stream.title}" from the stream library?`)) {
    return;
  }
  try {
    await api.delete(`/streams/${stream.id}`);
    streams.value = streams.value.filter((s) => s.id !== stream.id);
    emit('evicted', stream.id);
  } catch (err: unknown) {
    alert((err as Error).message || 'Failed to evict stream');
  }
}

function handleWsMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'stream_ready') {
      fetchStreams();
    }
  } catch {
    // Ignore non-JSON
  }
}

onMounted(() => {
  fetchStreams();
  window.addEventListener('message', handleWsMessage);
  const mdmWs = (window as unknown as { __mdm_ws?: WebSocket }).__mdm_ws;
  if (mdmWs) {
    mdmWs.addEventListener('message', handleWsMessage);
  }
});

onUnmounted(() => {
  window.removeEventListener('message', handleWsMessage);
  const mdmWs = (window as unknown as { __mdm_ws?: WebSocket }).__mdm_ws;
  if (mdmWs) {
    mdmWs.removeEventListener('message', handleWsMessage);
  }
});

defineExpose({
  fetchStreams,
});
</script>
