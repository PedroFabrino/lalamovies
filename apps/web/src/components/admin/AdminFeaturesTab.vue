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
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition shrink-0 cursor-pointer flex items-center gap-2"
        :disabled="isLoadingFeatureFlags"
        @click="$emit('refresh')"
      >
        <RefreshCw
          class="w-3.5 h-3.5 text-violet-400"
          :class="{ 'animate-spin': isLoadingFeatureFlags }"
        />
        <span>Refresh</span>
      </button>
    </div>

    <!-- Categorized Feature Cards -->
    <div class="space-y-6">
      <AdminFeatureCategoryCard
        title="Content & Discovery"
        description="Control front-of-house discovery shelves and media playback pipelines"
        :flags="discoveryFlags"
        :is-loading="isLoadingFeatureFlags"
        :is-updating-flag="isUpdatingFlag"
        :high-impact-flags="HIGH_IMPACT_FLAGS"
        @toggle="onToggleClick"
      />

      <AdminFeatureCategoryCard
        title="Downloads & Torrents"
        description="Control ingestion pipelines, qBittorrent submissions, and tracker scrapers"
        :flags="downloadsFlags"
        :is-loading="isLoadingFeatureFlags"
        :is-updating-flag="isUpdatingFlag"
        :high-impact-flags="HIGH_IMPACT_FLAGS"
        @toggle="onToggleClick"
      />

      <AdminFeatureCategoryCard
        title="Automation & System"
        description="Control background telemetry, garbage collection, and cron daemons"
        :flags="automationFlags"
        :is-loading="isLoadingFeatureFlags"
        :is-updating-flag="isUpdatingFlag"
        :high-impact-flags="HIGH_IMPACT_FLAGS"
        @toggle="onToggleClick"
      />
    </div>

    <!-- High-Impact Feature Flag Confirmation Modal (Subtask #87) -->
    <div
      v-if="flagConfirmModal"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in"
        data-testid="flag-confirm-modal"
      >
        <div class="flex items-center gap-3 text-amber-400">
          <div class="w-10 h-10 rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center shrink-0">
            <AlertTriangle class="w-5 h-5" />
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
            class="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
            :disabled="isUpdatingFlag !== null"
            @click="flagConfirmModal = null"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            :disabled="isUpdatingFlag !== null"
            @click="onConfirmDisable(flagConfirmModal.flag)"
          >
            <Loader2
              v-if="isUpdatingFlag === flagConfirmModal.flag.id"
              class="animate-spin h-4 w-4 text-white"
            />
            <span>Confirm Disable</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RefreshCw, AlertTriangle, Loader2 } from 'lucide-vue-next';
import AdminFeatureCategoryCard from './AdminFeatureCategoryCard.vue';

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
