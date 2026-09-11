<template>
  <header class="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-6">
      <router-link
        to="/dashboard"
        class="flex items-center gap-3"
      >
        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow">
          M
        </div>
        <span class="font-semibold text-lg text-white">Media Download Manager</span>
      </router-link>

      <!-- Navigation links -->
      <nav class="hidden sm:flex items-center gap-2">
        <router-link
          to="/dashboard"
          class="px-3 py-1.5 text-sm font-medium rounded-lg transition"
          :class="isRouteActive('/dashboard') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
        >
          Dashboard
        </router-link>
        <router-link
          to="/request"
          class="px-3 py-1.5 text-sm font-medium rounded-lg transition"
          :class="isRouteActive('/request') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
        >
          New Request
        </router-link>
        <router-link
          to="/waitlist"
          class="px-3 py-1.5 text-sm font-medium rounded-lg transition"
          :class="isRouteActive('/waitlist') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
        >
          Waitlist
        </router-link>
        <router-link
          v-if="authStore.isAdmin"
          to="/admin"
          class="px-3 py-1.5 text-sm font-medium rounded-lg transition"
          :class="isRouteActive('/admin') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
        >
          Admin
        </router-link>
      </nav>
    </div>

    <div class="flex items-center gap-4">
      <!-- Live WS feed indicator -->
      <div
        class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition"
        :class="isConnected ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-amber-950/40 border-amber-800 text-amber-400'"
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"
        />
        <span>{{ isConnected ? 'Live Feed' : 'Connecting...' }}</span>
      </div>

      <div class="text-right hidden sm:block">
        <div class="text-sm font-medium text-white flex items-center gap-2 justify-end">
          <span>{{ authStore.user?.username }}</span>
          <span
            v-if="authStore.isAdmin"
            class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase tracking-wider"
          >
            Admin
          </span>
        </div>
      </div>

      <button
        type="button"
        class="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition cursor-pointer"
        @click="handleLogout"
      >
        Sign Out
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useProgressSocket } from '../composables/useProgressSocket';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { isConnected } = useProgressSocket();

function isRouteActive(path: string): boolean {
  return route.path === path;
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>
