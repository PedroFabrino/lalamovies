<template>
  <div class="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Users class="w-4 h-4 text-violet-400" />
        <span class="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Party Crew ({{ participants.length }})
        </span>
      </div>

      <!-- Room Code with 1-Click Copy -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition cursor-pointer"
        :title="'Copy invite link for ' + partyId"
        @click="copyInviteLink"
      >
        <Copy class="w-3 h-3 text-violet-400" />
        <span>{{ partyId.slice(0, 8) }}</span>
        <span
          v-if="copied"
          class="text-emerald-400 text-[10px]"
        >Copied!</span>
      </button>
    </div>

    <!-- Participants Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <div
        v-for="p in participants"
        :key="p.id"
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800/70 text-xs"
      >
        <div class="relative shrink-0">
          <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px]">
            {{ p.username.charAt(0).toUpperCase() }}
          </div>
          <span
            class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-950"
            :class="p.online ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'"
          />
        </div>

        <div class="min-w-0 flex-1 truncate">
          <div class="font-medium text-zinc-200 truncate flex items-center gap-1">
            <span class="truncate">{{ p.username }}</span>
            <span
              v-if="p.isHost"
              class="text-[10px] text-amber-400 shrink-0"
              title="Host"
            >👑</span>
          </div>
          <span class="text-[10px] text-zinc-500 block truncate">
            {{ p.isHost ? 'Host' : (p.online ? 'In Room' : 'Away') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Users, Copy } from 'lucide-vue-next';
import { useRequestsStore } from '../../stores/requests';

export interface Participant {
  id: string;
  username: string;
  isHost: boolean;
  online: boolean;
}

const props = defineProps<{
  partyId: string;
  hostUsername: string;
  hostUserId: string;
}>();

const requestsStore = useRequestsStore();
const copied = ref(false);

const participants = computed<Participant[]>(() => {
  return [
    {
      id: props.hostUserId,
      username: props.hostUsername,
      isHost: true,
      online: true,
    },
    {
      id: 'presence-viewer-1',
      username: 'CinemaBuddy',
      isHost: false,
      online: true,
    },
  ];
});

async function copyInviteLink() {
  const url = `${window.location.origin}/party/${props.partyId}`;
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    requestsStore.showToast('Watch party link copied to clipboard!', 'success');
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    requestsStore.showToast('Failed to copy invite link', 'error');
  }
}
</script>
