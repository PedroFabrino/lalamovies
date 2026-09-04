<template>
  <router-view />
  <Analytics />
  <SpeedInsights />
</template>

<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';
import { SpeedInsights } from '@vercel/speed-insights/vue';
</script>
