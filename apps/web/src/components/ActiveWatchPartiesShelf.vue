<template>
  <div>
    <!-- Active Rooms Grid -->
    <div
      v-if="parties.length > 0"
      class="mb-8 space-y-4"
      data-testid="active-watch-parties-shelf"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl">🎉</span>
          <h2 class="text-lg font-bold text-white tracking-tight">
            Active Watch Parties
          </h2>
          <span class="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-medium">
            {{ parties.length }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
            data-testid="button-host-party-header"
            @click="openGenericHostModal"
          >
            <span>+</span>
            <span>Host Party</span>
          </button>
          <button
            type="button"
            class="text-xs text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1"
            :disabled="loading"
            @click="fetchParties"
          >
            <span :class="{ 'animate-spin': loading }">🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="party in parties"
          :key="party.id"
          class="bg-zinc-900/80 border border-purple-900/30 hover:border-purple-500/50 rounded-2xl p-4 flex gap-4 shadow-xl transition relative overflow-hidden group"
          :data-testid="`party-card-${party.id}`"
        >
          <!-- Background subtle glow -->
          <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

          <!-- Poster -->
          <img
            v-if="party.posterUrl"
            :src="party.posterUrl"
            :alt="party.title"
            class="w-16 h-24 object-cover rounded-xl shrink-0 border border-zinc-800 shadow-md"
          >
          <div
            v-else
            class="w-16 h-24 bg-zinc-950 rounded-xl flex items-center justify-center text-zinc-600 shrink-0 border border-zinc-800"
          >
            🎬
          </div>

          <!-- Details -->
          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                  Live Party
                </span>
                <span
                  class="text-[10px] font-medium px-1.5 py-0.5 rounded border"
                  :class="party.controlMode === 'host_only'
                    ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'"
                >
                  {{ party.controlMode === 'host_only' ? '👑 Host Only' : '👥 Democratic' }}
                </span>
              </div>

              <h3
                class="font-bold text-sm text-white truncate"
                :title="party.title"
              >
                {{ party.title }}
              </h3>

              <p class="text-xs text-zinc-400 mt-0.5 truncate">
                <span v-if="party.seasonNumber && party.episodeNumber">
                  S{{ String(party.seasonNumber).padStart(2, '0') }}E{{ String(party.episodeNumber).padStart(2, '0') }} •
                </span>
                <span>Host: <strong class="text-zinc-200">{{ party.hostUsername }}</strong></span>
              </p>
            </div>

            <div class="pt-2 flex items-center gap-2">
              <button
                type="button"
                class="flex-1 py-1.5 px-3 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20"
                @click="openJoinModal(party)"
              >
                <span>Join Party</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State Call-to-Action Banner -->
    <div
      v-else-if="featureFlags.isEnabled('watch_parties')"
      class="mb-8 p-4 rounded-2xl bg-purple-950/20 border border-purple-900/30 hover:border-purple-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg transition"
      data-testid="watch-parties-empty-banner"
    >
      <div class="flex items-center gap-3">
        <span class="text-2xl p-2 bg-purple-900/30 rounded-xl border border-purple-800/40">🎉</span>
        <div>
          <h3 class="text-sm font-bold text-white tracking-tight">
            Watch Parties
          </h3>
          <p class="text-xs text-zinc-400">
            Watch movies & series in real-time sync with friends backed by Jellyfin SyncPlay.
          </p>
        </div>
      </div>
      <button
        type="button"
        class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0"
        data-testid="button-host-party-banner"
        @click="openGenericHostModal"
      >
        <span>🎉</span>
        <span>Host a Watch Party</span>
      </button>
    </div>

    <!-- Generic Watch Party Creation Modal -->
    <CreateWatchPartyModal
      :open="showCreateModal"
      :item="null"
      @close="showCreateModal = false"
      @created="handleCreatedFromShelf"
    />

    <!-- Join Bridge & SyncPlay Guidance Modal -->
    <SyncPlayBridgeModal
      :open="!!selectedParty"
      :party="selectedParty"
      @close="selectedParty = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../lib/api';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import SyncPlayBridgeModal from './SyncPlayBridgeModal.vue';
import CreateWatchPartyModal from './CreateWatchPartyModal.vue';

export interface WatchParty {
  id: string;
  hostUserId: string;
  hostUsername: string;
  jellyfinGroupId: string;
  jellyfinGroupName: string;
  mediaType: string;
  metadataId?: string;
  jellyfinItemId: string;
  title: string;
  year?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  posterUrl?: string;
  controlMode: 'everyone' | 'host_only';
  status: 'active' | 'ended';
  jellyfinWebUrl?: string;
  historyJson?: string;
  createdAt: string;
}

const emit = defineEmits<{
  (e: 'partyCreated', party: WatchParty): void;
}>();

const featureFlags = useFeatureFlags();
const parties = ref<WatchParty[]>([]);
const loading = ref(false);
const selectedParty = ref<WatchParty | null>(null);
const showCreateModal = ref(false);

function openGenericHostModal() {
  showCreateModal.value = true;
}

function handleCreatedFromShelf(party: WatchParty) {
  showCreateModal.value = false;
  fetchParties();
  if (party.jellyfinItemId) {
    window.open(`#!/details?id=${party.jellyfinItemId}`, '_blank');
  }
  selectedParty.value = party;
  emit('partyCreated', party);
}

function openJoinModal(party: WatchParty) {
  selectedParty.value = party;
}

async function fetchParties() {
  loading.value = true;
  try {
    const res = await api.get<{ watchParties: WatchParty[] }>('/watch-parties');
    parties.value = res.watchParties || [];
  } catch {
    parties.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchParties();
});

defineExpose({
  fetchParties,
  openGenericHostModal,
});
</script>
