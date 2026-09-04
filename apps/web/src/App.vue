<template>
  <router-view />
  <Analytics />
</template>

<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';
</script>
