<template>
  <div
    v-if="open && party"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    data-testid="syncplay-bridge-modal"
  >
    <div
      class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">👥</span>
          <h3 class="text-lg font-bold text-white tracking-tight">
            Connect to SyncPlay
          </h3>
        </div>
        <button
          type="button"
          class="text-zinc-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="bg-purple-950/30 border border-purple-800/50 p-4 rounded-xl space-y-2">
        <div class="text-xs text-purple-300 font-bold uppercase tracking-wider">
          Target SyncPlay Room
        </div>
        <div class="text-sm font-semibold text-white">
          {{ party.jellyfinGroupName }}
        </div>
        <div class="text-xs text-zinc-400">
          Now watching: <span class="text-zinc-200 font-medium">{{ party.title }}</span>
        </div>
      </div>

      <div class="space-y-3 text-xs text-zinc-300">
        <div class="font-semibold text-white">
          Quick 2-step setup in Jellyfin:
        </div>
        <ol class="list-decimal list-inside space-y-1.5 text-zinc-400">
          <li>We'll open Jellyfin directly to this media item.</li>
          <li>
            In the playback controls or top bar, tap the <strong>SyncPlay (👥)</strong> icon and select
            <strong class="text-purple-300">{{ party.jellyfinGroupName }}</strong>.
          </li>
        </ol>
      </div>

      <!-- Dedicated Watching on TV / AirPlay Section (#216) -->
      <div
        class="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2"
        data-testid="syncplay-tv-guidance"
      >
        <div class="flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <span>📺</span>
          <span>Watching on Apple TV or Smart TV?</span>
        </div>
        <p class="text-[11px] text-zinc-400 leading-relaxed">
          TV apps (like Swiftfin) lack SyncPlay support. To watch in sync on your TV, open the web player on your device and AirPlay or Cast playback directly to your TV.
        </p>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="px-4 py-2 text-sm text-zinc-400 hover:text-white transition cursor-pointer"
          @click="emit('close')"
        >
          Done
        </button>
        <a
          :href="getJellyfinLaunchUrl(party)"
          target="_blank"
          rel="noopener noreferrer"
          class="px-5 py-2 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-600/20"
          data-testid="syncplay-launch-link"
          @click="emit('close')"
        >
          <span>Launch in Jellyfin</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WatchParty } from './ActiveWatchPartiesShelf.vue';

defineProps<{
  open: boolean;
  party: WatchParty | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function getJellyfinLaunchUrl(party: WatchParty): string {
  if (party.jellyfinWebUrl) {
    return party.jellyfinWebUrl;
  }
  const base = 'https://watch.lalamovies.stream';
  return party.jellyfinItemId ? `${base}/web/index.html#!/details?id=${party.jellyfinItemId}` : base;
}
</script>
