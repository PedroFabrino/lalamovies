<template>
  <div class="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3 flex flex-col">
    <!-- Header with Countdown Trigger -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <MessageSquare class="w-4 h-4 text-violet-400" />
        <span class="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Party Chat & Reactions
        </span>
      </div>

      <!-- Sync Countdown Timer Badge -->
      <div
        v-if="countdown > 0"
        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-600/30 border border-violet-500/50 text-violet-300 text-xs font-bold animate-pulse"
      >
        <span>Starting in {{ countdown }}s...</span>
      </div>
      <button
        v-else-if="isHost"
        type="button"
        class="text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition cursor-pointer"
        @click="startCountdown"
      >
        Sync Countdown (3s)
      </button>
    </div>

    <!-- Message Stream -->
    <div class="h-28 overflow-y-auto space-y-2 pr-1 text-xs">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/60 flex items-start justify-between gap-2"
      >
        <div>
          <span class="font-semibold text-violet-300 mr-1.5">{{ msg.author }}:</span>
          <span class="text-zinc-200">{{ msg.text }}</span>
        </div>
        <span class="text-[10px] text-zinc-500 shrink-0">{{ msg.time }}</span>
      </div>
    </div>

    <!-- Emoji Reactions Bar -->
    <div class="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
      <button
        v-for="emoji in emojis"
        :key="emoji"
        type="button"
        class="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm hover:scale-110 active:scale-95 transition cursor-pointer"
        @click="sendReaction(emoji)"
      >
        {{ emoji }}
      </button>
    </div>

    <!-- Input Form -->
    <form
      class="flex items-center gap-2 pt-1"
      @submit.prevent="sendMessage"
    >
      <input
        v-model="inputText"
        type="text"
        placeholder="Say something to the room..."
        class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
      >
      <button
        type="submit"
        class="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-40"
        :disabled="!inputText.trim()"
      >
        <Send class="w-3.5 h-3.5" />
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MessageSquare, Send } from 'lucide-vue-next';

interface ChatMessage {
  author: string;
  text: string;
  time: string;
}

const props = defineProps<{
  username: string;
  isHost: boolean;
}>();

const emojis = ['🍿', '🔥', '👏', '😂', '❤️', '👀'];
const inputText = ref('');
const countdown = ref(0);

const messages = ref<ChatMessage[]>([
  {
    author: 'System',
    text: 'SyncPlay room initialized. Playback is synchronized across all active clients.',
    time: 'Now',
  },
]);

function sendMessage() {
  if (!inputText.value.trim()) return;
  messages.value.push({
    author: props.username || 'You',
    text: inputText.value.trim(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
  inputText.value = '';
}

function sendReaction(emoji: string) {
  messages.value.push({
    author: props.username || 'You',
    text: `reacted with ${emoji}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
}

function startCountdown() {
  countdown.value = 3;
  const interval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(interval);
      messages.value.push({
        author: 'System',
        text: '🎬 Playback launched!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  }, 1000);
}
</script>
