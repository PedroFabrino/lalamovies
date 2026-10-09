<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <!-- Navbar -->
    <Navbar />

    <!-- Main Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
      <!-- Toast Alert -->
      <WaitlistToast
        :toast="waitlistStore.toast"
        @dismiss="waitlistStore.clearToast"
      />

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Waitlist</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-normal">
              {{ waitlistStore.entries.length }}
            </span>
          </h1>
          <p class="text-sm text-zinc-400 mt-1">
            Monitor unreleased or unavailable media. High-quality releases are automatically snatched when available.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Admin View Toggle (Ticket 10) -->
          <div
            v-if="authStore.isAdmin"
            class="flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs"
            data-testid="admin-view-toggle"
          >
            <button
              type="button"
              data-testid="toggle-view-mine"
              class="px-3 py-1.5 rounded-md font-medium transition cursor-pointer"
              :class="activeView === 'mine' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'"
              @click="setView('mine')"
            >
              My Entries
            </button>
            <button
              type="button"
              data-testid="toggle-view-all"
              class="px-3 py-1.5 rounded-md font-medium transition cursor-pointer"
              :class="activeView === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'"
              @click="setView('all')"
            >
              All Users
            </button>
          </div>

          <!-- Expand/Collapse All Button (Spec #221) -->
          <button
            type="button"
            data-testid="toggle-collapse-all-btn"
            class="px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1.5"
            :title="allExpanded ? 'Collapse All Tiers' : 'Expand All Tiers'"
            @click="toggleAll"
          >
            <span>{{ allExpanded ? 'Collapse All' : 'Expand All' }}</span>
          </button>

          <button
            type="button"
            class="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
            :disabled="waitlistStore.loading || isCheckingAll"
            title="Check Trackers & Refresh"
            data-testid="refresh-waitlist-btn"
            @click="handleCheckAll"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': waitlistStore.loading || isCheckingAll }"
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
          </button>

          <button
            type="button"
            data-testid="open-add-waitlist-modal"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition flex items-center gap-2 cursor-pointer"
            @click="openSearchModal"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add to Waitlist</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="waitlistStore.loading && waitlistStore.entries.length === 0"
        class="py-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3"
      >
        <svg
          class="w-8 h-8 animate-spin text-indigo-500"
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
        <p class="text-sm">
          Loading waitlist entries...
        </p>
      </div>

      <!-- Empty State -->
      <WaitlistGlobalEmptyState
        v-else-if="waitlistStore.entries.length === 0"
        @add="openSearchModal"
      />

      <!-- Tiered Sections (Spec #221) -->
      <div
        v-else
        class="space-y-6"
        data-testid="waitlist-grid"
      >
        <WaitlistTierSection
          v-for="tier in tierDefinitions"
          :key="tier.key"
          :tier="tier"
          :entries="partitioned[tier.key]"
          :is-expanded="tierStates[tier.key]"
          :approving-entry-id="approvingEntryId"
          :checking-entry-id="checkingEntryId"
          :now="now"
          @toggle="toggleTier(tier.key)"
          @approve="handleApprove"
          @check="handleCheckEntry"
          @cancel="handleCancel"
          @manual-pick="handleManualPick"
        />
      </div>
    </main>

    <!-- Add to Waitlist Modal -->
    <WaitlistAddModal
      ref="addModalRef"
      :open="isModalOpen"
      @close="isModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, toRef, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import WaitlistTierSection from '../components/waitlist/WaitlistTierSection.vue';
import WaitlistToast from '../components/waitlist/WaitlistToast.vue';
import WaitlistGlobalEmptyState from '../components/waitlist/WaitlistGlobalEmptyState.vue';
import WaitlistAddModal from '../components/waitlist/WaitlistAddModal.vue';
import type { WaitlistCandidate } from '../components/waitlist/waitlistModalTypes';
import { useWaitlistStore, WaitlistEntry } from '../stores/waitlist';
import { useAuthStore } from '../stores/auth';
import { useWaitlistTiers } from '../composables/useWaitlistTiers';
import { api } from '../lib/api';

const route = useRoute();
const router = useRouter();
const waitlistStore = useWaitlistStore();
const authStore = useAuthStore();

const entriesRef = toRef(waitlistStore, 'entries');
const {
  tierStates,
  partitioned,
  allExpanded,
  toggleTier,
  toggleAll,
  tierDefinitions,
} = useWaitlistTiers(entriesRef);

// Admin view toggle (Ticket 10)
const activeView = ref<'mine' | 'all'>(authStore.isAdmin ? 'all' : 'mine');

async function loadEntries() {
  if (authStore.isAdmin && activeView.value === 'mine') {
    await waitlistStore.fetchAll({ userId: authStore.user?.id });
  } else {
    await waitlistStore.fetchAll({ allUsers: true });
  }
}

async function setView(view: 'mine' | 'all') {
  activeView.value = view;
  await loadEntries();
}

// Live ticker for notification countdowns
const now = ref(Date.now());
let tickerInterval: ReturnType<typeof setInterval> | null = null;

const isModalOpen = ref(false);
const addModalRef = ref<InstanceType<typeof WaitlistAddModal> | null>(null);

function openSearchModal() {
  addModalRef.value?.openSearchModal();
  isModalOpen.value = true;
}

onMounted(async () => {
  tickerInterval = setInterval(() => {
    now.value = Date.now();
  }, 1000);

  await loadEntries();

  // Check if routed with prefilled metadata from RequestView (Ticket 09)
  if (route.query.add === 'true' && route.query.title) {
    isModalOpen.value = true;
  }
});

onUnmounted(() => {
  if (tickerInterval) {
    clearInterval(tickerInterval);
  }
});

const checkingEntryId = ref<string | null>(null);
const isCheckingAll = ref(false);

async function handleCheckEntry(entry: WaitlistEntry) {
  checkingEntryId.value = entry.id;
  try {
    const res = await api.post<{ entry?: { status?: string }; message?: string }>(`/waitlist/${entry.id}/check`);
    await loadEntries();
    if (res?.message) {
      waitlistStore.showToast(res.message, res?.entry?.status === 'notified' ? 'success' : 'info');
    } else if (res?.entry?.status === 'notified') {
      waitlistStore.showToast(`Found release for "${entry.title}"! Auto-downloading soon.`, 'success');
    } else {
      waitlistStore.showToast(`Checked trackers for "${entry.title}". Still waiting for quality release.`, 'info');
    }
  } catch (err: unknown) {
    waitlistStore.showToast((err as Error).message || 'Failed to check trackers', 'error');
  } finally {
    checkingEntryId.value = null;
  }
}

async function handleCheckAll() {
  isCheckingAll.value = true;
  try {
    await api.post<unknown>('/waitlist/poll-now');
    await loadEntries();
    waitlistStore.showToast('Checked trackers for all active entries.', 'success');
  } catch (err: unknown) {
    waitlistStore.showToast((err as Error).message || 'Failed to poll trackers', 'error');
  } finally {
    isCheckingAll.value = false;
  }
}

async function handleCancel(entry: WaitlistEntry) {
  try {
    await waitlistStore.cancelEntry(entry.id);
  } catch {
    // Error is handled in store
  }
}

const approvingEntryId = ref<string | null>(null);

async function handleApprove(entry: WaitlistEntry) {
  approvingEntryId.value = entry.id;
  try {
    await waitlistStore.approveEntry(entry.id);
  } catch {
    // Error is handled in store
  } finally {
    approvingEntryId.value = null;
  }
}

function handleManualPick(entry: WaitlistEntry) {
  const query: Record<string, string> = {
    fromWaitlist: 'true',
    waitlistId: entry.id,
    mediaType: entry.mediaType,
    metadataId: String(entry.metadataId),
    metadataSource: entry.metadataSource || 'tmdb',
    title: entry.title,
  };
  if (entry.year) query.year = String(entry.year);
  if (entry.seasonNumber !== null && entry.seasonNumber !== undefined) {
    query.seasonNumber = String(entry.seasonNumber);
  }
  if (entry.targetEpisode !== null && entry.targetEpisode !== undefined) {
    query.episodeNumber = String(entry.targetEpisode);
  }
  if (entry.posterUrl) query.posterUrl = entry.posterUrl;

  router.push({ path: '/request', query });
}

defineExpose({
  openSearchModal,
  selectCandidate: (candidate: WaitlistCandidate) => addModalRef.value?.selectCandidate(candidate),
  get searchMediaType() {
    return addModalRef.value?.searchMediaType;
  },
  set searchMediaType(val: 'movie' | 'tv_show' | 'anime' | undefined) {
    if (addModalRef.value && val) {
      addModalRef.value.searchMediaType = val;
    }
  },
});
</script>
