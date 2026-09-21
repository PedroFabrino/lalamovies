<template>
  <!-- eslint-disable vue/no-mutating-props -->
  <div class="max-w-4xl mx-auto space-y-8">
    <!-- General System Settings Card -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-white">
          System Settings
        </h2>
        <p class="text-xs text-zinc-400 mt-0.5">
          Tune download concurrency, cleanup thresholds, and third-party integrations.
        </p>
      </div>

      <!-- Alerts -->
      <div
        v-if="configSuccessMessage"
        class="mb-6 p-4 bg-emerald-950/50 border border-emerald-800 rounded-lg text-sm text-emerald-200 flex items-center gap-3"
      >
        <svg
          class="w-5 h-5 text-emerald-400 shrink-0"
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
        <span>{{ configSuccessMessage }}</span>
      </div>

      <div
        v-if="configErrorMessage"
        class="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg text-sm text-red-200 flex items-center gap-3"
      >
        <svg
          class="w-5 h-5 text-red-400 shrink-0"
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
        <span>{{ configErrorMessage }}</span>
      </div>

      <form
        class="space-y-6"
        @submit.prevent="$emit('saveConfig')"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label
              for="storage_quota_gb"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Storage Quota (GB)
            </label>
            <input
              id="storage_quota_gb"
              v-model.number="configForm.storage_quota_gb"
              type="number"
              min="1"
              step="1"
              required
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <p class="text-[11px] text-zinc-500 mt-1">
              Media stack quota allocation
            </p>
          </div>

          <div>
            <label
              for="concurrent_limit"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Max Concurrent Downloads
            </label>
            <input
              id="concurrent_limit"
              v-model.number="configForm.concurrent_limit"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <p class="text-[11px] text-zinc-500 mt-1">
              Simultaneous active downloads
            </p>
          </div>

          <div>
            <label
              for="disk_warn_threshold"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Disk Warn Threshold (%)
            </label>
            <input
              id="disk_warn_threshold"
              v-model.number="configForm.disk_warn_threshold"
              type="number"
              min="1"
              max="100"
              required
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <p class="text-[11px] text-zinc-500 mt-1">
              Triggers auto-cleanup scan
            </p>
          </div>

          <div>
            <label
              for="disk_reject_threshold"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Disk Reject Threshold (%)
            </label>
            <input
              id="disk_reject_threshold"
              v-model.number="configForm.disk_reject_threshold"
              type="number"
              min="1"
              max="100"
              required
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <p class="text-[11px] text-zinc-500 mt-1">
              Rejects new requests
            </p>
          </div>
        </div>

        <div>
          <label
            for="discord_webhook_url"
            class="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Discord Webhook URL
          </label>
          <input
            id="discord_webhook_url"
            v-model="configForm.discord_webhook_url"
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
          <p class="text-[11px] text-zinc-500 mt-1">
            Receives download and 24h cleanup warning notifications.
          </p>
        </div>

        <div>
          <label
            for="tmdb_api_key"
            class="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            TMDB API Key
          </label>
          <div class="relative">
            <input
              id="tmdb_api_key"
              v-model="configForm.tmdb_api_key"
              :type="showTmdbKey ? 'text' : 'password'"
              placeholder="v3 auth key"
              class="w-full px-3 py-2 pr-10 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <button
              type="button"
              class="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              @click="showTmdbKey = !showTmdbKey"
            >
              <span class="text-xs">{{ showTmdbKey ? 'Hide' : 'Show' }}</span>
            </button>
          </div>
        </div>

        <div class="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            type="submit"
            :disabled="isSavingConfig"
            class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg
              v-if="isSavingConfig"
              class="animate-spin h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>{{ isSavingConfig ? 'Saving...' : 'Save Configuration' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Media Server (Jellyfin) Card -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2.5">
            <h2 class="text-lg font-semibold text-white">
              Media Server (Jellyfin)
            </h2>
            <!-- Status Badge -->
            <span
              v-if="jellyfinLoading"
              class="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 animate-pulse"
            >
              Checking...
            </span>
            <span
              v-else-if="jellyfinStatus?.reachable && jellyfinStatus?.authenticated"
              class="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1.5"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
            <span
              v-else-if="jellyfinStatus?.reachable && !jellyfinStatus?.authenticated"
              class="px-2 py-0.5 rounded text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1.5"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Auth Error (HTTP 401)
            </span>
            <span
              v-else
              class="px-2 py-0.5 rounded text-xs font-medium bg-red-950/80 text-red-300 border border-red-800 flex items-center gap-1.5"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-red-400" />
              Unreachable
            </span>
          </div>
          <p class="text-xs text-zinc-400 mt-1">
            Monitor Jellyfin server connection health and manually trigger library rescans.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            :disabled="jellyfinLoading"
            class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Jellyfin Status"
            @click="$emit('checkJellyfinStatus')"
          >
            <svg
              class="w-3.5 h-3.5"
              :class="{ 'animate-spin': jellyfinLoading }"
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
            <span>Check Connection</span>
          </button>

          <button
            type="button"
            :disabled="isRescanningJellyfin"
            class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            @click="$emit('rescanJellyfin')"
          >
            <svg
              v-if="isRescanningJellyfin"
              class="animate-spin h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <svg
              v-else
              class="w-3.5 h-3.5"
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
            <span>{{ isRescanningJellyfin ? 'Scanning...' : 'Rescan Library' }}</span>
          </button>
        </div>
      </div>

      <!-- Alert for Jellyfin Actions -->
      <div
        v-if="jellyfinMessage"
        class="p-3.5 rounded-lg text-xs flex items-center gap-2.5 mb-4"
        :class="jellyfinMessageType === 'success'
          ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-200'
          : 'bg-red-950/50 border border-red-800 text-red-200'"
      >
        <span>{{ jellyfinMessage }}</span>
      </div>

      <div
        v-if="jellyfinStatus?.error"
        class="p-3.5 rounded-lg text-xs bg-amber-950/50 border border-amber-800 text-amber-200 flex items-start gap-2.5 mb-4"
      >
        <svg
          class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"
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
        <div>
          <span class="font-medium">Diagnostic: </span>{{ jellyfinStatus.error }}
          <div
            v-if="!jellyfinStatus.authenticated"
            class="mt-1 text-zinc-400"
          >
            Ensure <code class="px-1 py-0.5 bg-zinc-950 rounded text-zinc-300">JELLYFIN_API_KEY</code> is correctly configured in your server environment file (.env).
          </div>
        </div>
      </div>

      <!-- Info Details Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/60 text-xs">
        <div class="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
          <span class="text-zinc-500 block mb-0.5">Server Name</span>
          <span class="font-medium text-white">{{ jellyfinStatus?.serverName || '—' }}</span>
        </div>
        <div class="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
          <span class="text-zinc-500 block mb-0.5">Version</span>
          <span class="font-medium text-white">{{ jellyfinStatus?.version || '—' }}</span>
        </div>
        <div class="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
          <span class="text-zinc-500 block mb-0.5">Authentication</span>
          <span
            class="font-medium"
            :class="jellyfinStatus?.authenticated ? 'text-emerald-400' : 'text-amber-400'"
          >
            {{ jellyfinStatus?.authenticated ? 'Authenticated (Token Valid)' : 'Unauthenticated / Token Missing' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Subtitle Transcription Window Card -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-white">
          Subtitle Transcription Window
        </h2>
        <p class="text-xs text-zinc-400 mt-0.5">
          Configure the off-peak daily schedule window for GPU-accelerated Whisper subtitle generation.
        </p>
      </div>

      <!-- Alerts -->
      <div
        v-if="transcriptionSuccessMessage"
        class="mb-6 p-4 bg-emerald-950/50 border border-emerald-800 rounded-lg text-sm text-emerald-200 flex items-center gap-3"
      >
        <svg
          class="w-5 h-5 text-emerald-400 shrink-0"
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
        <span>{{ transcriptionSuccessMessage }}</span>
      </div>

      <div
        v-if="transcriptionErrorMessage"
        class="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg text-sm text-red-200 flex items-center gap-3"
      >
        <svg
          class="w-5 h-5 text-red-400 shrink-0"
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
        <span>{{ transcriptionErrorMessage }}</span>
      </div>

      <form
        class="space-y-6"
        @submit.prevent="$emit('saveTranscriptionConfig')"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label
              for="transcription_window_start"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Window Start Time
            </label>
            <input
              id="transcription_window_start"
              v-model="transcriptionForm.transcription_window_start"
              type="time"
              required
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <p class="text-[11px] text-zinc-500 mt-1">
              Start of off-peak window (HH:MM)
            </p>
          </div>

          <div>
            <label
              for="transcription_window_end"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Window End Time
            </label>
            <input
              id="transcription_window_end"
              v-model="transcriptionForm.transcription_window_end"
              type="time"
              required
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <p class="text-[11px] text-zinc-500 mt-1">
              End of off-peak window (HH:MM)
            </p>
          </div>

          <div>
            <label
              for="transcription_timezone"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Schedule Timezone
            </label>
            <div class="flex gap-2">
              <input
                id="transcription_timezone"
                v-model="transcriptionForm.transcription_timezone"
                type="text"
                required
                placeholder="e.g. America/Sao_Paulo"
                class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
              <button
                type="button"
                title="Set to browser timezone"
                class="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 text-xs whitespace-nowrap cursor-pointer transition"
                @click="transcriptionForm.transcription_timezone = browserTimezone"
              >
                Use Local
              </button>
            </div>
            <p class="text-[11px] text-zinc-500 mt-1">
              Detected browser timezone: <span class="text-zinc-400 font-mono">{{ browserTimezone }}</span>
            </p>
          </div>
        </div>

        <div class="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            type="submit"
            :disabled="isSavingTranscription"
            class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg
              v-if="isSavingTranscription"
              class="animate-spin h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>{{ isSavingTranscription ? 'Saving...' : 'Save Transcription Settings' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

export interface JellyfinStatusInfo {
  reachable: boolean;
  authenticated: boolean;
  error?: string;
  serverName?: string;
  version?: string;
}

export interface ConfigFormData {
  storage_quota_gb: number;
  concurrent_limit: number;
  disk_warn_threshold: number;
  disk_reject_threshold: number;
  discord_webhook_url: string;
  tmdb_api_key: string;
}

export interface TranscriptionFormData {
  transcription_window_start: string;
  transcription_window_end: string;
  transcription_timezone: string;
}

defineProps<{
  configForm: ConfigFormData;
  isSavingConfig: boolean;
  configSuccessMessage: string | null;
  configErrorMessage: string | null;
  jellyfinStatus: JellyfinStatusInfo | null;
  jellyfinLoading: boolean;
  isRescanningJellyfin: boolean;
  jellyfinMessage: string | null;
  jellyfinMessageType: 'success' | 'error';
  transcriptionForm: TranscriptionFormData;
  isSavingTranscription: boolean;
  transcriptionSuccessMessage: string | null;
  transcriptionErrorMessage: string | null;
  browserTimezone: string;
}>();

defineEmits<{
  (e: 'saveConfig'): void;
  (e: 'checkJellyfinStatus'): void;
  (e: 'rescanJellyfin'): void;
  (e: 'saveTranscriptionConfig'): void;
}>();

const showTmdbKey = ref(false);
</script>
