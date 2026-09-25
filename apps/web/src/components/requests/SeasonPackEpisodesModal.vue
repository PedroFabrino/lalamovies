<template>
  <div
    v-if="show"
    data-testid="season-pack-episodes-modal"
    class="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div class="max-w-4xl w-full my-8">
      <SeasonPackEpisodesDrawer
        :request-id="requestId"
        :media-title="title"
        :is-admin="isAdmin"
        :is-primary="canManage"
        @close="$emit('close')"
        @episode-pruned="$emit('episodePruned', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SeasonPackEpisodesDrawer from './SeasonPackEpisodesDrawer.vue';

defineProps<{
  show: boolean;
  requestId: string;
  title?: string;
  isAdmin?: boolean;
  canManage?: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'episodePruned', payload: { episodeId: string; wholeRequestDeleted: boolean }): void;
}>();
</script>
