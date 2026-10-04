<script setup lang="ts">
import { ref } from 'vue';
import type { PlaybackSession, SystemMetrics } from '../../composables/useAdminActivity';
import AdminHardwareBanner from './AdminHardwareBanner.vue';
import AdminSessionCard from './AdminSessionCard.vue';

defineProps<{
  sessions: PlaybackSession[];
  system?: SystemMetrics | null;
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
</script>

<template>
  <div class="space-y-6">
    <!-- Hardware Telemetry Banner -->
    <AdminHardwareBanner :system="system || null" />

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
      <AdminSessionCard
        v-for="session in sessions"
        :key="session.id"
        :session="session"
        @stop="openStopModal"
      />
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
            Are you sure you want to stop the stream for <span class="font-medium text-white">{{ sessionToStop.userName }}</span> on
            <span class="font-medium text-white">{{ sessionToStop.deviceName }}</span>?
          </p>
        </div>

        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1.5">
            Notice Message to User (Optional)
          </label>
          <input
            v-model="stopMessage"
            type="text"
            maxlength="150"
            placeholder="e.g., Server restart in 5 minutes"
            class="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
          >
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            :disabled="isStoppingSession"
            class="px-4 py-2 text-sm font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
            @click="closeStopModal"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isStoppingSession"
            class="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            @click="handleConfirmStop"
          >
            <svg
              v-if="isStoppingSession"
              class="w-4 h-4 animate-spin"
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
            <span>{{ isStoppingSession ? 'Stopping...' : 'Confirm Stop' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
