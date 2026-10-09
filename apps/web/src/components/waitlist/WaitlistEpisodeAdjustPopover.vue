<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
    data-testid="episode-adjust-popover"
    @click.self="$emit('close')"
  >
    <div
      class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-sm shadow-2xl space-y-4"
      @click.stop
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-sm font-semibold text-white">
            Adjust Target Episode
          </h3>
          <p class="text-xs text-zinc-400 truncate max-w-[240px]">
            {{ entry.title }}
          </p>
        </div>
        <button
          type="button"
          class="p-1 text-zinc-400 hover:text-white rounded transition cursor-pointer"
          @click="$emit('close')"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Error message -->
      <div
        v-if="errorMessage"
        class="p-2 text-xs text-red-300 bg-red-950/50 border border-red-800 rounded-lg"
      >
        {{ errorMessage }}
      </div>

      <form
        class="space-y-3.5"
        @submit.prevent="handleSave"
      >
        <!-- Season Input -->
        <div>
          <label class="block text-xs font-medium text-zinc-300 mb-1">
            Season
          </label>
          <input
            v-model.number="seasonNumber"
            type="number"
            min="1"
            data-testid="adjust-season-input"
            class="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-indigo-500"
            required
          >
        </div>

        <!-- Season Pack Toggle -->
        <div class="flex items-center justify-between py-1">
          <label
            for="season-pack-toggle"
            class="text-xs font-medium text-zinc-300 cursor-pointer"
          >
            Track Full Season Pack
          </label>
          <input
            id="season-pack-toggle"
            v-model="isSeasonPack"
            type="checkbox"
            data-testid="adjust-season-pack-toggle"
            class="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          >
        </div>

        <!-- Episode Input -->
        <div v-if="!isSeasonPack">
          <label class="block text-xs font-medium text-zinc-300 mb-1">
            Target Episode
          </label>
          <input
            v-model.number="targetEpisode"
            type="number"
            min="1"
            data-testid="adjust-episode-input"
            class="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white focus:outline-hidden focus:border-indigo-500"
            required
          >
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            data-testid="popover-cancel-btn"
            class="px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            :disabled="saving"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="popover-save-btn"
            class="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition cursor-pointer flex items-center gap-1.5"
            :disabled="!isValid || saving"
          >
            <svg
              v-if="saving"
              class="w-3.5 h-3.5 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{{ saving ? 'Saving...' : 'Save Changes' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { WaitlistEntry } from '../../stores/waitlist';
import { useWaitlistStore } from '../../stores/waitlist';

const props = defineProps<{
  open: boolean;
  entry: WaitlistEntry;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', entry: WaitlistEntry): void;
}>();

const waitlistStore = useWaitlistStore();

const seasonNumber = ref<number>(props.entry.seasonNumber ?? 1);
const isSeasonPack = ref<boolean>(props.entry.targetEpisode === null || props.entry.targetEpisode === undefined);
const targetEpisode = ref<number>(props.entry.targetEpisode ?? 1);

const saving = ref(false);
const errorMessage = ref<string | null>(null);

const isValid = computed(() => {
  if (!seasonNumber.value || seasonNumber.value < 1) return false;
  if (!isSeasonPack.value && (!targetEpisode.value || targetEpisode.value < 1)) return false;
  return true;
});

async function handleSave() {
  if (!isValid.value || saving.value) return;

  saving.value = true;
  errorMessage.value = null;

  try {
    const updated = await waitlistStore.updateTarget(props.entry.id, {
      seasonNumber: seasonNumber.value,
      targetEpisode: isSeasonPack.value ? null : targetEpisode.value,
    });
    emit('saved', updated);
    emit('close');
  } catch (err: unknown) {
    errorMessage.value = (err as Error).message || 'Failed to update target';
  } finally {
    saving.value = false;
  }
}
</script>
