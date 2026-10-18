<template>
  <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-white">
            Media Server (Jellyfin)
          </h2>
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
</template>

<script setup lang="ts">
export interface JellyfinStatusInfo {
  reachable: boolean;
  authenticated: boolean;
  error?: string;
  serverName?: string;
  version?: string;
}

defineProps<{
  jellyfinStatus: JellyfinStatusInfo | null;
  jellyfinLoading: boolean;
  isRescanningJellyfin: boolean;
  jellyfinMessage: string | null;
  jellyfinMessageType: 'success' | 'error';
}>();

defineEmits<{
  (e: 'checkJellyfinStatus'): void;
  (e: 'rescanJellyfin'): void;
}>();
</script>
