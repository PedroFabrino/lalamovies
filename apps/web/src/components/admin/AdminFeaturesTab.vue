<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Error Alert -->
    <div
      v-if="featureFlagsError"
      class="p-4 rounded-xl border bg-red-950/60 border-red-800 text-red-200 text-sm flex items-center justify-between"
    >
      <span>{{ featureFlagsError }}</span>
      <button
        type="button"
        class="text-zinc-400 hover:text-white"
        @click="$emit('dismissError')"
      >
        ✕
      </button>
    </div>

    <!-- Info Banner -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-white">
          Runtime Feature Flags & Kill Switches
        </h2>
        <p class="text-sm text-zinc-400 mt-1">
          Toggle 9 core application capabilities instantly with zero downtime. High-impact operational flags trigger a safety guardrail before entering Degraded Mode.
        </p>
      </div>
      <button
        type="button"
        class="px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition shrink-0 cursor-pointer flex items-center gap-2"
        :disabled="isLoadingFeatureFlags"
        @click="$emit('refresh')"
      >
        <svg
          class="w-3.5 h-3.5"
          :class="{ 'animate-spin': isLoadingFeatureFlags }"
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
        <span>Refresh</span>
      </button>
    </div>

    <!-- 3 Categorized Cards -->
    <div class="space-y-6">
      <!-- 1. Content & Discovery -->
      <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
        <div class="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-white">
              Content & Discovery
            </h3>
            <p class="text-xs text-zinc-400 mt-0.5">
              Control front-of-house discovery shelves and media playback pipelines
            </p>
          </div>
          <span class="text-xs text-zinc-500 font-mono">{{ discoveryFlags.length }} subsystems</span>
        </div>

        <div
          v-if="isLoadingFeatureFlags && discoveryFlags.length === 0"
          class="h-20 bg-zinc-950/40 rounded-lg animate-pulse"
        />
        <div
          v-else-if="discoveryFlags.length === 0"
          class="py-4 text-center text-xs text-zinc-500"
        >
          No subsystem flags found in this category.
        </div>
        <div
          v-else
          class="divide-y divide-zinc-800/60"
        >
          <div
            v-for="flag in discoveryFlags"
            :key="flag.id"
            class="py-4 first:pt-2 last:pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2.5">
                <span class="font-medium text-white text-sm">{{ flag.name }}</span>
                <span
                  class="px-2 py-0.5 text-[11px] font-semibold rounded-full border"
                  :class="flag.enabled ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-rose-950/60 border-rose-800 text-rose-400'"
                >
                  {{ flag.enabled ? 'Operational' : 'Disabled' }}
                </span>
                <span
                  v-if="HIGH_IMPACT_FLAGS.includes(flag.id)"
                  class="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-950/60 border border-amber-800 text-amber-300"
                >
                  High Impact
                </span>
              </div>
              <p class="text-xs text-zinc-400 max-w-2xl">
                {{ flag.description }}
              </p>
              <div class="text-[11px] text-zinc-500 flex items-center gap-3 pt-0.5">
                <span>Key: <code class="text-zinc-400">{{ flag.id }}</code></span>
                <span>•</span>
                <span>Updated: {{ formatDate(flag.updatedAt) }}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <button
                type="button"
                role="switch"
                :aria-checked="flag.enabled"
                :disabled="isUpdatingFlag === flag.id"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50"
                :class="flag.enabled ? 'bg-indigo-600' : 'bg-zinc-700'"
                @click="onToggleClick(flag)"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="flag.enabled ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Downloads & Torrents -->
      <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
        <div class="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-white">
              Downloads & Torrents
            </h3>
            <p class="text-xs text-zinc-400 mt-0.5">
              Control ingestion pipelines, qBittorrent submissions, and tracker scrapers
            </p>
          </div>
          <span class="text-xs text-zinc-500 font-mono">{{ downloadsFlags.length }} subsystems</span>
        </div>

        <div
          v-if="isLoadingFeatureFlags && downloadsFlags.length === 0"
          class="h-20 bg-zinc-950/40 rounded-lg animate-pulse"
        />
        <div
          v-else-if="downloadsFlags.length === 0"
          class="py-4 text-center text-xs text-zinc-500"
        >
          No subsystem flags found in this category.
        </div>
        <div
          v-else
          class="divide-y divide-zinc-800/60"
        >
          <div
            v-for="flag in downloadsFlags"
            :key="flag.id"
            class="py-4 first:pt-2 last:pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2.5">
                <span class="font-medium text-white text-sm">{{ flag.name }}</span>
                <span
                  class="px-2 py-0.5 text-[11px] font-semibold rounded-full border"
                  :class="flag.enabled ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-rose-950/60 border-rose-800 text-rose-400'"
                >
                  {{ flag.enabled ? 'Operational' : 'Disabled' }}
                </span>
                <span
                  v-if="HIGH_IMPACT_FLAGS.includes(flag.id)"
                  class="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-950/60 border border-amber-800 text-amber-300"
                >
                  High Impact
                </span>
              </div>
              <p class="text-xs text-zinc-400 max-w-2xl">
                {{ flag.description }}
              </p>
              <div class="text-[11px] text-zinc-500 flex items-center gap-3 pt-0.5">
                <span>Key: <code class="text-zinc-400">{{ flag.id }}</code></span>
                <span>•</span>
                <span>Updated: {{ formatDate(flag.updatedAt) }}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <button
                type="button"
                role="switch"
                :aria-checked="flag.enabled"
                :disabled="isUpdatingFlag === flag.id"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50"
                :class="flag.enabled ? 'bg-indigo-600' : 'bg-zinc-700'"
                @click="onToggleClick(flag)"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="flag.enabled ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Automation & System -->
      <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
        <div class="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-white">
              Automation & System
            </h3>
            <p class="text-xs text-zinc-400 mt-0.5">
              Safeguard background schedulers, storage eviction, and external webhooks
            </p>
          </div>
          <span class="text-xs text-zinc-500 font-mono">{{ automationFlags.length }} subsystems</span>
        </div>

        <div
          v-if="isLoadingFeatureFlags && automationFlags.length === 0"
          class="h-20 bg-zinc-950/40 rounded-lg animate-pulse"
        />
        <div
          v-else-if="automationFlags.length === 0"
          class="py-4 text-center text-xs text-zinc-500"
        >
          No subsystem flags found in this category.
        </div>
        <div
          v-else
          class="divide-y divide-zinc-800/60"
        >
          <div
            v-for="flag in automationFlags"
            :key="flag.id"
            class="py-4 first:pt-2 last:pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2.5">
                <span class="font-medium text-white text-sm">{{ flag.name }}</span>
                <span
                  class="px-2 py-0.5 text-[11px] font-semibold rounded-full border"
                  :class="flag.enabled ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-rose-950/60 border-rose-800 text-rose-400'"
                >
                  {{ flag.enabled ? 'Operational' : 'Disabled' }}
                </span>
                <span
                  v-if="HIGH_IMPACT_FLAGS.includes(flag.id)"
                  class="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-950/60 border border-amber-800 text-amber-300"
                >
                  High Impact
                </span>
              </div>
              <p class="text-xs text-zinc-400 max-w-2xl">
                {{ flag.description }}
              </p>
              <div class="text-[11px] text-zinc-500 flex items-center gap-3 pt-0.5">
                <span>Key: <code class="text-zinc-400">{{ flag.id }}</code></span>
                <span>•</span>
                <span>Updated: {{ formatDate(flag.updatedAt) }}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <button
                type="button"
                role="switch"
                :aria-checked="flag.enabled"
                :disabled="isUpdatingFlag === flag.id"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50"
                :class="flag.enabled ? 'bg-indigo-600' : 'bg-zinc-700'"
                @click="onToggleClick(flag)"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="flag.enabled ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- High-Impact Feature Flag Confirmation Modal (Subtask #87) -->
    <div
      v-if="flagConfirmModal"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4"
        data-testid="flag-confirm-modal"
      >
        <div class="flex items-center gap-3 text-amber-400">
          <div class="w-10 h-10 rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center shrink-0">
            <svg
              class="w-5 h-5"
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
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">
              Disable {{ flagConfirmModal.flag.name }}?
            </h3>
            <span class="text-xs font-semibold text-amber-400 uppercase tracking-wide">High-Impact Kill Switch</span>
          </div>
        </div>

        <p class="text-sm text-zinc-300">
          {{ flagConfirmModal.impactMessage }}
        </p>

        <p class="text-xs text-zinc-400">
          The system will enter Degraded Mode for this subsystem immediately.
        </p>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
            :disabled="isUpdatingFlag !== null"
            @click="flagConfirmModal = null"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            :disabled="isUpdatingFlag !== null"
            @click="onConfirmDisable(flagConfirmModal.flag)"
          >
            <svg
              v-if="isUpdatingFlag === flagConfirmModal.flag.id"
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
            <span>Confirm Disable</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

export interface AdminFeatureFlag {
  id: string;
  name: string;
  description: string;
  category: 'discovery' | 'downloads' | 'automation';
  enabled: boolean;
  updatedAt: string;
}

const props = defineProps<{
  featureFlagsList: AdminFeatureFlag[];
  isLoadingFeatureFlags: boolean;
  isUpdatingFlag: string | null;
  featureFlagsError: string | null;
  formatDate: (date: string) => string;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'dismissError'): void;
  (e: 'toggleFlag', flag: AdminFeatureFlag, targetEnabled: boolean): void;
}>();

const HIGH_IMPACT_FLAGS = ['automated_cleanup', 'manual_torrents', 'streaming'];

const HIGH_IMPACT_MESSAGES: Record<string, string> = {
  automated_cleanup:
    'Disabling Automated Disk Cleanup suspends automatic periodic media eviction. Host storage may exhaust if new downloads continue.',
  manual_torrents:
    'Disabling Manual Torrent Submissions halts new single torrent requests and magnet link additions across all users.',
  streaming:
    'Disabling Ephemeral Streaming prevents new instant playback sessions. Existing active streams remain playable until natural expiration.',
};

const flagConfirmModal = ref<{
  flag: AdminFeatureFlag;
  targetEnabled: boolean;
  impactMessage: string;
} | null>(null);

const discoveryFlags = computed(() =>
  props.featureFlagsList.filter((f) => f.category === 'discovery')
);
const downloadsFlags = computed(() =>
  props.featureFlagsList.filter((f) => f.category === 'downloads')
);
const automationFlags = computed(() =>
  props.featureFlagsList.filter((f) => f.category === 'automation')
);

function onToggleClick(flag: AdminFeatureFlag) {
  const targetEnabled = !flag.enabled;
  if (!targetEnabled && HIGH_IMPACT_FLAGS.includes(flag.id)) {
    flagConfirmModal.value = {
      flag,
      targetEnabled,
      impactMessage:
        HIGH_IMPACT_MESSAGES[flag.id] ||
        'Disabling this subsystem will place background workers and user flows into Degraded Mode.',
    };
    return;
  }
  emit('toggleFlag', flag, targetEnabled);
}

function onConfirmDisable(flag: AdminFeatureFlag) {
  flagConfirmModal.value = null;
  emit('toggleFlag', flag, false);
}
</script>
