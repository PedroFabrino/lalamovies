<template>
  <AppLayout v-if="isAuthenticatedRoute">
    <router-view />
  </AppLayout>
  <router-view v-else />
  <Analytics />
  <SpeedInsights />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Analytics } from '@vercel/analytics/vue';
import { SpeedInsights } from '@vercel/speed-insights/vue';
import AppLayout from './components/layout/AppLayout.vue';

const route = useRoute();

const isAuthenticatedRoute = computed(() => {
  return route.meta?.requiresAuth === true;
});
</script>
