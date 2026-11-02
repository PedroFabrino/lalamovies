<template>
  <header class="sticky top-0 z-30 border-b border-zinc-800/60 bg-cinema-950/90 backdrop-blur-xl">
    <div class="flex h-16 items-center justify-between px-4 sm:px-6">
      <!-- Left: Mobile Menu & View Title & Live Feed Status -->
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          class="rounded-xl border border-zinc-800/70 p-2 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-100 lg:hidden cursor-pointer"
          @click="$emit('open-menu')"
        >
          <Menu class="h-5 w-5" />
        </button>

        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-zinc-100 sm:text-base">
            {{ currentTitle }}
          </p>
          <div class="flex items-center gap-1.5">
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"
            />
            <Radio
              class="h-3 w-3"
              :class="isConnected ? 'text-emerald-400' : 'text-amber-400'"
            />
            <span
              class="text-[10px] font-mono tracking-wider"
              :class="isConnected ? 'text-emerald-400' : 'text-amber-400'"
            >
              {{ isConnected ? 'LIVE FEED CONNECTED' : 'CONNECTING...' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Right: Action Buttons & Profile Dropdown -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Invite button (desktop) -->
        <button
          type="button"
          class="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-700/40 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-800/50 hover:text-zinc-100 cursor-pointer"
          @click="$emit('open-invite')"
        >
          <Users class="h-4 w-4" />
          <span>Invite</span>
        </button>

        <!-- Notification Bell -->
        <button
          type="button"
          aria-label="Notifications"
          class="rounded-lg p-2 text-zinc-400 transition-all hover:bg-zinc-800/60 hover:text-zinc-100 cursor-pointer"
          @click="handleNotificationsClick"
        >
          <Bell class="h-4 w-4" />
        </button>

        <!-- Profile Menu Dropdown -->
        <div
          ref="profileDropdownRef"
          class="relative"
        >
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg p-1 transition-all hover:bg-zinc-800/50 cursor-pointer"
            aria-label="User Profile"
            @click="profileOpen = !profileOpen"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-indigo to-accent-violet text-xs font-bold text-white shadow">
              {{ userInitial }}
            </div>
            <ChevronDown
              class="hidden sm:block h-3.5 w-3.5 text-zinc-400 transition-transform"
              :class="profileOpen ? 'rotate-180' : ''"
            />
          </button>

          <!-- Dropdown popup -->
          <div
            v-if="profileOpen"
            class="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-zinc-700/60 bg-cinema-900/95 backdrop-blur-xl shadow-2xl z-50 animate-scale-in"
          >
            <div class="border-b border-zinc-800/80 p-3">
              <p class="text-sm font-semibold text-zinc-100 truncate">
                {{ authStore.user?.username || 'User' }}
              </p>
              <p class="text-xs text-zinc-500 truncate capitalize">
                {{ authStore.user?.role || 'Guest' }}
              </p>
            </div>
            <div class="p-1.5 space-y-0.5">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-800/60 hover:text-zinc-100 cursor-pointer"
                @click="openSettings"
              >
                <Settings class="h-3.5 w-3.5 text-zinc-400" />
                <span>Account Settings</span>
              </button>
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-400 transition-all hover:bg-red-950/30 hover:text-red-300 cursor-pointer"
                @click="handleLogout"
              >
                <LogOut class="h-3.5 w-3.5 text-red-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Menu,
  Radio,
  Users,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
} from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import { useRequestsStore } from '../../stores/requests';
import { useProgressSocket } from '../../composables/useProgressSocket';

const emit = defineEmits<{
  (e: 'open-menu'): void;
  (e: 'open-invite'): void;
  (e: 'open-settings'): void;
}>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const requestsStore = useRequestsStore();
const { isConnected } = useProgressSocket();

const profileOpen = ref(false);
const profileDropdownRef = ref<HTMLElement | null>(null);

const titlesMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/library': 'Media Library',
  '/request': 'New Request',
  '/waitlist': 'Waitlist',
  '/anime': 'Seasonal Anime',
  '/admin': 'Admin & Infrastructure',
  '/forbidden': 'Access Forbidden',
  '/telegram-auth': 'Telegram Authentication',
};

const currentTitle = computed(() => {
  if (route.path.startsWith('/party')) {
    return 'Watch Party';
  }
  return titlesMap[route.path] || 'LalaMovies';
});

const userInitial = computed(() => {
  const name = authStore.user?.username || 'U';
  return name.charAt(0).toUpperCase();
});

const openSettings = () => {
  profileOpen.value = false;
  emit('open-settings');
};

const handleNotificationsClick = () => {
  requestsStore.showToast('All media services are running normally', 'info');
};

const handleLogout = async () => {
  profileOpen.value = false;
  await authStore.logout();
  router.push('/login');
};

const handleClickOutside = (e: MouseEvent) => {
  if (profileDropdownRef.value && !profileDropdownRef.value.contains(e.target as Node)) {
    profileOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
