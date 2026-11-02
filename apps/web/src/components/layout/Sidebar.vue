<template>
  <div>
    <!-- Mobile Drawer Backdrop -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
      aria-label="Close navigation"
      @click="$emit('close-mobile')"
    />

    <!-- Sidebar Aside -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-800/70 bg-cinema-900/95 backdrop-blur-xl transition-all duration-300 lg:translate-x-0"
      :class="[
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'w-64 lg:w-[76px]' : 'w-64'
      ]"
    >
      <!-- Brand Header -->
      <div
        class="flex h-16 items-center border-b border-zinc-800/60"
        :class="collapsed ? 'justify-between px-4 lg:justify-center lg:px-3' : 'justify-between px-4'"
      >
        <router-link
          to="/dashboard"
          class="flex items-center gap-2.5 transition"
          :class="collapsed ? 'lg:justify-center' : ''"
          @click="$emit('close-mobile')"
        >
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-violet to-accent-indigo flex items-center justify-center glow-violet shrink-0 shadow">
            <Film
              class="w-5 h-5 text-white"
              :stroke-width="2.5"
            />
          </div>
          <div
            v-if="!collapsed"
            class="min-w-0"
          >
            <p class="text-base font-bold text-zinc-100 tracking-tight">
              Lala<span class="text-accent-neon text-glow">Movies</span>
            </p>
            <span class="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Feed
            </span>
          </div>
        </router-link>

        <button
          type="button"
          class="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 lg:hidden cursor-pointer"
          aria-label="Close mobile navigation"
          @click="$emit('close-mobile')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-hide">
        <p
          v-if="!collapsed"
          class="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 select-none"
        >
          Navigation
        </p>

        <template
          v-for="item in visibleNavItems"
          :key="item.path"
        >
          <router-link
            :to="item.path"
            :title="item.disabled ? item.disabledTitle : (collapsed ? item.label : undefined)"
            :tabindex="item.disabled ? -1 : undefined"
            class="group flex w-full items-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all"
            :class="[
              collapsed ? 'justify-center' : 'gap-3',
              item.disabled
                ? 'opacity-40 cursor-not-allowed pointer-events-none text-zinc-500 border-transparent'
                : isRouteActive(item.path)
                  ? 'border-accent-violet/30 bg-accent-violet/15 text-accent-neon'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
            ]"
            @click="item.disabled ? null : $emit('close-mobile')"
          >
            <component
              :is="item.icon"
              class="h-4.5 w-4.5 shrink-0"
            />
            <span
              v-if="!collapsed"
              class="truncate"
            >{{ item.label }}</span>
            <span
              v-if="!collapsed && isRouteActive(item.path)"
              class="ml-auto h-1.5 w-1.5 rounded-full bg-accent-neon"
            />
          </router-link>
        </template>
      </nav>

      <!-- Bottom Actions & Storage Footprint -->
      <div class="space-y-2 border-t border-zinc-800/60 p-3">
        <!-- Storage mini-indicator -->
        <div
          v-if="!collapsed"
          class="rounded-xl border border-zinc-800/70 bg-zinc-900/50 p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <span class="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <HardDrive class="h-3.5 w-3.5" /> Storage
            </span>
            <span class="font-mono text-[10px] text-zinc-500">62%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div class="h-full w-[62%] rounded-full bg-gradient-to-r from-accent-indigo to-accent-violet" />
          </div>
          <p class="mt-1.5 text-[10px] font-mono text-zinc-600">
            12.4TB / 20TB
          </p>
        </div>

        <!-- Invite Friends Button -->
        <button
          type="button"
          :title="collapsed ? 'Invite Friends' : undefined"
          class="flex w-full items-center rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-3 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-accent-violet/30 hover:bg-accent-violet/10 hover:text-zinc-100 cursor-pointer"
          :class="collapsed ? 'justify-center' : 'gap-3'"
          @click="$emit('open-invite')"
        >
          <Users class="h-4.5 w-4.5 shrink-0" />
          <span
            v-if="!collapsed"
            class="truncate"
          >Invite Friends</span>
        </button>

        <!-- Desktop Collapse / Expand Toggle Button -->
        <button
          type="button"
          :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          class="hidden w-full items-center justify-center rounded-xl p-2 text-zinc-500 transition-all hover:bg-zinc-800 hover:text-zinc-100 lg:flex cursor-pointer"
          @click="$emit('toggle-collapsed')"
        >
          <PanelLeftOpen
            v-if="collapsed"
            class="h-4.5 w-4.5"
          />
          <PanelLeftClose
            v-else
            class="h-4.5 w-4.5"
          />
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, type Component } from 'vue';
import { useRoute } from 'vue-router';
import {
  LayoutDashboard,
  Library,
  PlusCircle,
  Clock,
  PlayCircle,
  Sparkles,
  Settings,
  Film,
  Users,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import { useFeatureFlags } from '../../composables/useFeatureFlags';

const props = defineProps<{
  collapsed: boolean;
  mobileOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-collapsed'): void;
  (e: 'close-mobile'): void;
  (e: 'open-invite'): void;
}>();

const route = useRoute();
const authStore = useAuthStore();
const featureFlags = useFeatureFlags();

const isRouteActive = (path: string) => {
  if (path === '/dashboard') {
    return route.path === '/dashboard' || route.path === '/';
  }
  return route.path.startsWith(path);
};

interface NavItem {
  path: string;
  label: string;
  icon: Component;
  visible: boolean;
  disabled: boolean;
  disabledTitle?: string;
}

const visibleNavItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      visible: true,
      disabled: false,
    },
    {
      path: '/library',
      label: 'Library',
      icon: Library,
      visible: true,
      disabled: !featureFlags.isEnabled('jellyfin_library_view'),
      disabledTitle: 'Media library is temporarily unavailable',
    },
    {
      path: '/request',
      label: 'New Request',
      icon: PlusCircle,
      visible: true,
      disabled: !featureFlags.isEnabled('manual_torrents'),
      disabledTitle: 'Manual torrent requests are temporarily unavailable',
    },
    {
      path: '/waitlist',
      label: 'Waitlist',
      icon: Clock,
      visible: true,
      disabled: !featureFlags.isEnabled('waitlist'),
      disabledTitle: 'Waitlist is temporarily unavailable',
    },
    {
      path: '/anime',
      label: 'Seasonal Anime',
      icon: Sparkles,
      visible: featureFlags.isEnabled('seasonal_anime'),
      disabled: false,
    },
    {
      path: '/party',
      label: 'Watch Party',
      icon: PlayCircle,
      visible: featureFlags.isEnabled('watch_parties'),
      disabled: false,
    },
    {
      path: '/admin',
      label: 'Admin',
      icon: Settings,
      visible: !!authStore.isAdmin,
      disabled: false,
    },
  ];

  return items.filter((item) => item.visible);
});

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.mobileOpen) {
    emit('close-mobile');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>
