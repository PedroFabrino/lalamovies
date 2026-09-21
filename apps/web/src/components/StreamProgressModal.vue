<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    data-testid="stream-progress-modal"
  >
    <div
      class="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6 text-center"
      @click.stop
    >
      <!-- State: Pending -->
      <div v-if="status === 'pending'" class="space-y-4 py-4">
        <div class="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div class="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
          <div class="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
          <span class="absolute text-xl">⚡</span>
        </div>

        <div>
          <h3 class="text-lg font-bold text-white">
            Mounting Instant Stream
          </h3>
          <p class="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            Preparing <span class="text-amber-400 font-medium">{{ title }}</span> in the Jellyfin Stream library...
          </p>
        </div>

        <div class="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs text-zinc-500 text-left space-y-1.5">
          <div class="flex items-center gap-2 text-zinc-400">
            <span class="text-emerald-400 text-xs">✓</span> Verified cloud cache
          </div>
          <div class="flex items-center gap-2 text-amber-300 animate-pulse">
            <span>⏳</span> Mounting virtual stream & refreshing Jellyfin...
          </div>
        </div>
      </div>

      <!-- State: Ready -->
      <div v-else-if="status === 'ready'" class="space-y-4 py-2" data-testid="stream-ready-card">
        <div class="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-3xl">
          ✓
        </div>

        <div>
          <h3 class="text-lg font-bold text-white">
            Ready to Watch!
          </h3>
          <p class="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            <span class="text-zinc-200 font-semibold">{{ title }}</span> is now active in your Jellyfin Stream library.
          </p>
        </div>

        <div class="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300 text-left flex items-start gap-2.5">
          <span class="text-base leading-none">⏱️</span>
          <div>
            <div class="font-medium text-amber-200">Ephemeral Stream (24h)</div>
            <div class="text-[11px] text-amber-300/80 mt-0.5">
              Files are streamed from cloud storage and will automatically expire in 24 hours. You can promote it to permanent storage anytime from the dashboard.
            </div>
          </div>
        </div>

        <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <a
            :href="effectiveJellyfinUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            data-testid="button-open-jellyfin"
          >
            <span>▶</span>
            <span>Open in Jellyfin</span>
          </a>
          <button
            type="button"
            class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            data-testid="button-promote-stream"
            @click="handlePromote"
          >
            <span>💾</span>
            <span>Save Permanently</span>
          </button>
          <button
            type="button"
            class="w-full sm:w-auto px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl transition cursor-pointer"
            @click="handleClose"
          >
            Done
          </button>
        </div>
      </div>

      <!-- State: Error -->
      <div v-else class="space-y-4 py-2" data-testid="stream-error-card">
        <div class="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 text-2xl">
          ⚠️
        </div>
        <div>
          <h3 class="text-lg font-bold text-white">Stream Setup Failed</h3>
          <p class="text-xs text-red-300 mt-1 max-w-sm mx-auto leading-relaxed">
            {{ currentErrorMessage || errorMessage || 'An unexpected error occurred.' }}
          </p>
        </div>

        <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            v-if="canAddToWaitlist && !waitlistAdded"
            type="button"
            class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            data-testid="button-error-add-waitlist"
            :disabled="isAddingToWaitlist"
            @click="handleAddToWaitlist"
          >
            <span>⏳</span>
            <span>{{ isAddingToWaitlist ? 'Adding...' : 'Add to Waitlist' }}</span>
          </button>
          <span
            v-else-if="waitlistAdded"
            class="px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs font-medium flex items-center gap-1.5"
            data-testid="badge-waitlist-added"
          >
            <span>✓</span>
            <span>Added to Waitlist</span>
          </span>
          <button
            type="button"
            class="w-full sm:w-auto px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl transition cursor-pointer"
            data-testid="button-error-close"
            @click="handleClose"
          >
            {{ canAddToWaitlist ? 'Close & Pick Another' : 'Close' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { api } from '../lib/api';

const props = withDefaults(
  defineProps<{
    show: boolean;
    streamId?: string;
    title: string;
    initialStatus?: 'pending' | 'ready' | 'error';
    jellyfinUrl?: string;
    errorMessage?: string;
    canAddToWaitlist?: boolean;
    isAddingToWaitlist?: boolean;
    waitlistAdded?: boolean;
  }>(),
  {
    canAddToWaitlist: false,
    isAddingToWaitlist: false,
    waitlistAdded: false,
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'ready', payload: { streamId: string; jellyfinUrl: string }): void;
  (e: 'promote', payload: { streamId: string; title: string }): void;
  (e: 'error', payload: { streamId?: string; error: string; isInfringing?: boolean; infoHash?: string }): void;
  (e: 'add-to-waitlist'): void;
}>();

function handleAddToWaitlist() {
  emit('add-to-waitlist');
}

const status = ref<'pending' | 'ready' | 'error'>(props.initialStatus || 'pending');
const currentJellyfinUrl = ref(props.jellyfinUrl || '');
const currentErrorMessage = ref(props.errorMessage || '');

watch(
  () => props.initialStatus,
  (newStatus) => {
    if (newStatus) status.value = newStatus;
  }
);

watch(
  () => props.jellyfinUrl,
  (newUrl) => {
    if (newUrl) currentJellyfinUrl.value = newUrl;
  }
);

watch(
  () => props.errorMessage,
  (newMsg) => {
    if (newMsg) currentErrorMessage.value = newMsg;
  }
);

const effectiveJellyfinUrl = computed(() => {
  return currentJellyfinUrl.value || '/web/index.html';
});

function handleClose() {
  stopPolling();
  emit('close');
}

function handlePromote() {
  emit('promote', {
    streamId: props.streamId || '',
    title: props.title,
  });
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function checkStreamStatus() {
  if (!props.streamId || status.value !== 'pending') return;
  try {
    const res = await api.get<{ stream: { id?: string; status?: string; jellyfinUrl?: string; errorMessage?: string; error?: string } }>(
      `/streams/${props.streamId}`
    );
    if (res && res.stream) {
      if (res.stream.status === 'ready') {
        status.value = 'ready';
        if (res.stream.jellyfinUrl) {
          currentJellyfinUrl.value = res.stream.jellyfinUrl;
        }
        stopPolling();
        emit('ready', {
          streamId: res.stream.id || props.streamId,
          jellyfinUrl: currentJellyfinUrl.value || '',
        });
      } else if (res.stream.status === 'error' || res.stream.status === 'expired') {
        status.value = 'error';
        currentErrorMessage.value =
          res.stream.errorMessage || 'Stream setup failed or was cancelled.';
        stopPolling();
        const isInfringing =
          res.stream.errorMessage?.includes('infringing') ||
          res.stream.errorMessage?.includes('451');
        emit('error', {
          streamId: res.stream.id || props.streamId,
          error: currentErrorMessage.value,
          isInfringing,
        });
      }
    }
  } catch {
    // Non-blocking
  }
}

function startPolling() {
  stopPolling();
  if (props.show && props.streamId && status.value === 'pending') {
    pollTimer = setInterval(checkStreamStatus, 1500);
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

watch(
  () => [props.show, props.streamId, status.value],
  ([show, streamId, st]) => {
    if (show && streamId && st === 'pending') {
      startPolling();
    } else {
      stopPolling();
    }
  },
  { immediate: true }
);

function handleWebSocketMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'stream_ready') {
      if (!props.streamId || data.streamId === props.streamId) {
        status.value = 'ready';
        if (data.jellyfinUrl) {
          currentJellyfinUrl.value = data.jellyfinUrl;
        }
        stopPolling();
        emit('ready', {
          streamId: data.streamId,
          jellyfinUrl: currentJellyfinUrl.value,
        });
      }
    } else if (data.type === 'stream_error') {
      if (!props.streamId || data.streamId === props.streamId) {
        status.value = 'error';
        currentErrorMessage.value = data.error || 'Stream setup failed.';
        stopPolling();
        emit('error', {
          streamId: data.streamId || props.streamId,
          error: currentErrorMessage.value,
          isInfringing: Boolean(data.isInfringing),
          infoHash: data.infoHash,
        });
      }
    }
  } catch {
    // Ignore non-JSON messages
  }
}

onMounted(() => {
  window.addEventListener('message', handleWebSocketMessage);
  const mdmWs = (window as unknown as { __mdm_ws?: WebSocket }).__mdm_ws;
  if (mdmWs) {
    mdmWs.addEventListener('message', handleWebSocketMessage);
  }
});

onUnmounted(() => {
  stopPolling();
  window.removeEventListener('message', handleWebSocketMessage);
  const mdmWs = (window as unknown as { __mdm_ws?: WebSocket }).__mdm_ws;
  if (mdmWs) {
    mdmWs.removeEventListener('message', handleWebSocketMessage);
  }
});
</script>
