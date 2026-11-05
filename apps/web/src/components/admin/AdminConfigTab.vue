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
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

          <div>
            <label
              for="media_consumption_threshold"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Consumption Threshold (%)
            </label>
            <input
              id="media_consumption_threshold"
              v-model.number="configForm.media_consumption_threshold"
              type="number"
              min="1"
              max="100"
              required
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <p class="text-[11px] text-zinc-500 mt-1">
              Playback % for full consumption
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

        <div class="flex items-center justify-between p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-lg">
          <div>
            <label
              for="anime_include_adult"
              class="block text-xs font-medium text-zinc-300 cursor-pointer"
            >
              AniList Adult Anime (isAdult)
            </label>
            <p class="text-[11px] text-zinc-500 mt-0.5">
              Include 18+ adult content in seasonal anime catalogs. Default: Off (isAdult: false).
            </p>
          </div>
          <input
            id="anime_include_adult"
            v-model="configForm.anime_include_adult"
            type="checkbox"
            class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          >
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

    <!-- Preferred Indexer (BJ-Share) Card -->
    <AdminPreferredIndexerCard />

    <!-- Media Server (Jellyfin) Card -->
    <AdminJellyfinCard
      :jellyfin-status="jellyfinStatus"
      :jellyfin-loading="jellyfinLoading"
      :is-rescanning-jellyfin="isRescanningJellyfin"
      :jellyfin-message="jellyfinMessage"
      :jellyfin-message-type="jellyfinMessageType"
      @check-jellyfin-status="$emit('checkJellyfinStatus')"
      @rescan-jellyfin="$emit('rescanJellyfin')"
    />

    <!-- Subtitle Transcription Window Card -->
    <AdminTranscriptionCard
      :transcription-form="transcriptionForm"
      :is-saving-transcription="isSavingTranscription"
      :transcription-success-message="transcriptionSuccessMessage"
      :transcription-error-message="transcriptionErrorMessage"
      :browser-timezone="browserTimezone"
      @save-transcription-config="$emit('saveTranscriptionConfig')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AdminPreferredIndexerCard from './AdminPreferredIndexerCard.vue';
import AdminJellyfinCard, { type JellyfinStatusInfo } from './AdminJellyfinCard.vue';
import AdminTranscriptionCard, { type TranscriptionFormData } from './AdminTranscriptionCard.vue';

export type { JellyfinStatusInfo, TranscriptionFormData };

export interface ConfigFormData {
  storage_quota_gb: number;
  concurrent_limit: number;
  disk_warn_threshold: number;
  disk_reject_threshold: number;
  media_consumption_threshold: number;
  discord_webhook_url: string;
  tmdb_api_key: string;
  anime_include_adult?: boolean;
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
