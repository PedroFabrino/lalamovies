<template>
  <section
    :data-testid="`waitlist-tier-${tier.key}`"
    class="space-y-3"
  >
    <!-- Tier Header -->
    <div
      role="button"
      tabindex="0"
      :data-testid="`tier-toggle-${tier.key}`"
      class="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 transition cursor-pointer text-left select-none group"
      @click="$emit('toggle')"
      @keydown.enter.self="$emit('toggle')"
      @keydown.space.prevent.self="$emit('toggle')"
    >
      <div class="flex items-center gap-2.5">
        <span class="text-base select-none">{{ tier.icon }}</span>
        <h2 class="text-sm font-semibold text-zinc-100 group-hover:text-white transition">
          {{ tier.title }}
        </h2>
        <span
          :data-testid="`tier-badge-${tier.key}`"
          class="text-xs px-2 py-0.5 rounded-full font-medium"
          :class="entries.length > 0
            ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'"
        >
          {{ entries.length }}
        </span>
      </div>

      <div class="flex items-center gap-2.5 text-zinc-400 group-hover:text-zinc-200 transition">
        <button
          v-if="tier.key !== 'archive' && entries.length > 0"
          type="button"
          :data-testid="`tier-check-all-${tier.key}`"
          :disabled="isCheckingSection || Boolean(checkingEntryId)"
          title="Look for releases for all entries in this section"
          class="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-indigo-300 bg-zinc-800/90 hover:bg-indigo-950/40 rounded-lg border border-zinc-700/80 hover:border-indigo-800/60 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          @click.stop="$emit('check-section', tier.key, entries)"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': isCheckingSection }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span>{{ isCheckingSection ? 'Checking...' : 'Check Section' }}</span>
        </button>

        <svg
          class="w-4 h-4 transition-transform duration-200"
          :class="{ '-rotate-90': !isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>

    <!-- Tier Body (v-show to preserve DOM structure) -->
    <div
      v-show="isExpanded"
      :data-testid="`tier-body-${tier.key}`"
      class="space-y-4"
    >
      <!-- Empty Tier Placeholder -->
      <div
        v-if="entries.length === 0"
        data-testid="tier-empty-placeholder"
        class="border border-dashed border-zinc-800/80 rounded-xl p-6 text-center bg-zinc-950/30"
      >
        <p class="text-xs text-zinc-400">
          {{ tier.emptyMessage }}
        </p>
      </div>

      <!-- Entries Grid -->
      <div
        v-else
        :data-testid="`tier-grid-${tier.key}`"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <WaitlistCard
          v-for="entry in entries"
          :key="entry.id"
          :entry="entry"
          :is-approving="approvingEntryId === entry.id"
          :is-checking="checkingEntryId === entry.id || isCheckingSection"
          :now="now"
          @approve="$emit('approve', $event)"
          @check="$emit('check', $event)"
          @cancel="$emit('cancel', $event)"
          @manual-pick="$emit('manual-pick', $event)"
          @adjust="$emit('adjust', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import WaitlistCard from './WaitlistCard.vue';
import type { WaitlistEntry } from '../../stores/waitlist';
import type { WaitlistTierDefinition, WaitlistTierKey } from '../../composables/useWaitlistTiers';

withDefaults(
  defineProps<{
    tier: WaitlistTierDefinition;
    entries: WaitlistEntry[];
    isExpanded: boolean;
    approvingEntryId?: string | null;
    checkingEntryId?: string | null;
    isCheckingSection?: boolean;
    now?: number;
  }>(),
  {
    approvingEntryId: null,
    checkingEntryId: null,
    isCheckingSection: false,
    now: () => Date.now(),
  }
);

defineEmits<{
  (e: 'toggle'): void;
  (e: 'check-section', tierKey: WaitlistTierKey, entries: WaitlistEntry[]): void;
  (e: 'approve', entry: WaitlistEntry): void;
  (e: 'check', entry: WaitlistEntry): void;
  (e: 'cancel', entry: WaitlistEntry): void;
  (e: 'manual-pick', entry: WaitlistEntry): void;
  (e: 'adjust', entry: WaitlistEntry): void;
}>();
</script>
