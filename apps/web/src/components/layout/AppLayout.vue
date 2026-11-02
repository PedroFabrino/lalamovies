<template>
  <div class="min-h-screen bg-cinema-950 text-zinc-100 flex flex-col">
    <!-- Left Navigation Sidebar -->
    <Sidebar
      :collapsed="collapsed"
      :mobile-open="mobileOpen"
      @toggle-collapsed="toggleCollapsed"
      @close-mobile="mobileOpen = false"
      @open-invite="showInviteModal = true"
    />

    <!-- Main Content Area with Header -->
    <div
      class="flex-1 flex flex-col min-w-0 transition-all duration-300"
      :class="collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'"
    >
      <Header
        @open-menu="mobileOpen = true"
        @open-invite="showInviteModal = true"
        @open-settings="showSettingsModal = true"
      />

      <div class="flex-1 w-full">
        <slot />
      </div>
    </div>

    <!-- Modals -->
    <UserInviteModal
      v-if="showInviteModal"
      @close="showInviteModal = false"
    />

    <UserSettingsModal
      v-if="showSettingsModal"
      @close="showSettingsModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from './Sidebar.vue';
import Header from './Header.vue';
import UserInviteModal from '../UserInviteModal.vue';
import UserSettingsModal from '../UserSettingsModal.vue';

const collapsed = ref(false);
const mobileOpen = ref(false);
const showInviteModal = ref(false);
const showSettingsModal = ref(false);

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};
</script>
