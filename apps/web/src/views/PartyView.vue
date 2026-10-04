<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
    <!-- Loading Spinner -->
    <div
      v-if="loading"
      class="flex flex-col items-center gap-3 animate-pulse"
      data-testid="party-view-loading"
    >
      <div class="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p class="text-sm text-zinc-400 font-medium">
        Entering watch party...
      </p>
    </div>

    <!-- Active Watch Party Lobby Modal -->
    <WatchPartyLobbyModal
      v-if="party"
      :open="showLobby"
      :party="party"
      @close="handleClose"
      @media-switched="handleMediaSwitched"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../lib/api';
import { useRequestsStore } from '../stores/requests';
import WatchPartyLobbyModal from '../components/WatchPartyLobbyModal.vue';
import type { WatchParty } from '../components/ActiveWatchPartiesShelf.vue';

const router = useRouter();
const route = useRoute();
const requestsStore = useRequestsStore();

const party = ref<(WatchParty & { historyJson?: string }) | null>(null);
const loading = ref(true);
const showLobby = ref(false);

function onPartyUnavailable() {
  requestsStore.showToast(
    'This watch party has ended. You can start a new party from the dashboard.',
    'info',
  );
  router.replace('/dashboard');
}

async function loadParty() {
  const partyId = route.params.id as string;
  if (!partyId) {
    onPartyUnavailable();
    return;
  }

  loading.value = true;
  try {
    const res = await api.get<{ watchParty: WatchParty & { historyJson?: string } }>(
      `/watch-parties/${partyId}`,
    );
    if (!res.watchParty || res.watchParty.status !== 'active') {
      onPartyUnavailable();
      return;
    }
    party.value = res.watchParty;
    showLobby.value = true;
  } catch {
    onPartyUnavailable();
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  showLobby.value = false;
  router.push('/dashboard');
}

function handleMediaSwitched(updatedParty: WatchParty) {
  party.value = {
    ...party.value,
    ...updatedParty,
  };
}

function handleWsMessage(event: MessageEvent) {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    const currentPartyId = route.params.id as string;
    if (data.type === 'watch_party_ended' && data.partyId === currentPartyId) {
      showLobby.value = false;
      onPartyUnavailable();
    } else if (data.type === 'watch_party_media_switched' && data.party?.id === currentPartyId) {
      party.value = {
        ...party.value,
        ...data.party,
      };
    }
  } catch {
    // Ignore parse errors
  }
}

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadParty();
    }
  },
);

onMounted(() => {
  loadParty();
  window.addEventListener('message', handleWsMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleWsMessage);
});
</script>
