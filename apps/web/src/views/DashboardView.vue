<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <!-- Navigation Bar -->
    <header class="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow">
          M
        </div>
        <span class="font-semibold text-lg text-white">Media Download Manager</span>
      </div>

      <div class="flex items-center gap-4">
        <div class="text-right">
          <div class="text-sm font-medium text-white flex items-center gap-2">
            <span>{{ authStore.user?.username }}</span>
            <span
              v-if="authStore.isAdmin"
              class="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase tracking-wider"
            >
              Admin
            </span>
          </div>
          <div class="text-xs text-zinc-400">
            Jellyfin Connected
          </div>
        </div>

        <button
          class="px-3.5 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition cursor-pointer"
          @click="handleLogout"
        >
          Sign Out
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-6 py-8">
      <div class="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center">
        <h2 class="text-xl font-semibold text-white mb-2">
          Welcome, {{ authStore.user?.username }}!
        </h2>
        <p class="text-zinc-400 text-sm max-w-md mx-auto">
          Your session is active. Download requests dashboard and WebSocket real-time progress will appear here.
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>
