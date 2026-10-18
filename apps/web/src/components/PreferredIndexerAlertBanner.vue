<template>
  <div
    v-if="shouldShowBanner"
    class="w-full bg-gradient-to-r from-amber-950/90 via-red-950/90 to-amber-950/90 border-b border-amber-600/40 text-amber-200 px-4 sm:px-6 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg transition-all"
    role="alert"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
        <svg
          class="w-3.5 h-3.5 text-amber-400"
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
      <div class="truncate">
        <span class="font-bold text-amber-300 mr-1.5">
          {{ cookieStatus?.indexerName || 'BJ-Share' }} Cookie {{ cookieStatus?.status === 'missing' ? 'Missing' : 'Expired' }}:
        </span>
        <span class="text-zinc-200">
          Tracker session is inactive. Searches and automated downloads on preferred indexer are paused.
        </span>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <router-link
        to="/admin?tab=config"
        class="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
      >
        <span>Update Cookie</span>
        <span aria-hidden="true">&rarr;</span>
      </router-link>
      <button
        type="button"
        title="Check status again"
        :disabled="isLoadingStatus"
        class="p-1 hover:bg-amber-500/20 rounded text-amber-300 transition cursor-pointer disabled:opacity-50"
        @click="fetchCookieStatus(true)"
      >
        <svg
          class="w-3.5 h-3.5"
          :class="{ 'animate-spin': isLoadingStatus }"
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
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { usePreferredIndexerCookie } from '../composables/usePreferredIndexerCookie';

const authStore = useAuthStore();
const { cookieStatus, isLoadingStatus, fetchCookieStatus } = usePreferredIndexerCookie();

let pollInterval: ReturnType<typeof setInterval> | null = null;

const shouldShowBanner = computed(() => {
  if (!authStore.isAdmin) return false;
  return cookieStatus.value?.status === 'expired' || cookieStatus.value?.status === 'missing';
});

onMounted(() => {
  if (authStore.isAdmin) {
    fetchCookieStatus();
    // Re-check periodically every 60 seconds
    pollInterval = setInterval(() => {
      if (authStore.isAdmin) {
        fetchCookieStatus();
      }
    }, 60_000);
  }
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>
