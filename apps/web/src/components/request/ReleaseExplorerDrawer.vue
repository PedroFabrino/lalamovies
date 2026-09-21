<template>
  <div
    data-testid="release-explorer-drawer"
    class="border border-zinc-800 bg-zinc-950/50 rounded-xl overflow-hidden"
  >
    <!-- Expand / Collapse Toggle Header -->
    <button
      type="button"
      data-testid="toggle-explorer"
      class="w-full px-4 py-3 bg-zinc-900/40 hover:bg-zinc-900/80 transition flex items-center justify-between cursor-pointer text-left"
      @click="$emit('update:isExplorerExpanded', !isExplorerExpanded)"
    >
      <div class="flex items-center gap-2.5">
        <span class="text-sm">🔎</span>
        <div>
          <span class="text-xs font-semibold text-white">
            Explore All Releases
          </span>
          <span class="ml-2 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[11px] font-mono">
            {{ releaseCandidates.length }} found
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs text-zinc-400">
        <span>{{ isExplorerExpanded ? 'Hide alternatives' : 'Browse & choose alternative' }}</span>
        <svg
          class="w-4 h-4 transition-transform duration-200"
          :class="{ 'rotate-180': isExplorerExpanded }"
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
    </button>

    <!-- Expanded Explorer Content -->
    <div
      v-if="isExplorerExpanded"
      data-testid="explorer-drawer"
      class="p-4 border-t border-zinc-800 space-y-4"
    >
      <!-- Toolbar: Sorting & Count -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80 text-xs">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-zinc-400 font-medium">Sort By:</span>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="opt in sortOptions"
              :key="opt.value"
              type="button"
              :data-testid="'sort-' + opt.value"
              class="px-2.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer"
              :class="candidateSortBy === opt.value
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'"
              @click="$emit('update:candidateSortBy', opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 text-zinc-400 cursor-pointer text-[11px] select-none">
            <input
              :checked="hideInfringing"
              type="checkbox"
              class="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
              data-testid="toggle-hide-infringing"
              @change="$emit('update:hideInfringing', ($event.target as HTMLInputElement).checked)"
            >
            <span>Hide DMCA Blocked</span>
          </label>
          <span
            v-if="infringingCount > 0 && hideInfringing"
            class="text-amber-400/80 text-[11px]"
          >
            ({{ infringingCount }} hidden)
          </span>
          <span class="text-zinc-500 text-[11px]">
            Click any release to select it
          </span>
        </div>
      </div>

      <!-- Scrollable Candidate List -->
      <div class="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        <div
          v-for="candidate in sortedReleaseCandidates"
          :key="candidate.guid"
          :data-testid="'candidate-item-' + candidate.guid"
          class="p-3.5 rounded-lg border transition cursor-pointer flex flex-col gap-2 group"
          :class="selectedRelease?.guid === candidate.guid
            ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50'
            : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'"
          @click="$emit('selectRelease', candidate)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span
                  v-if="candidate.guid === recommendedRelease?.guid"
                  class="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-bold uppercase tracking-wider"
                >
                  ★ Recommended
                </span>
                <span
                  v-if="selectedRelease?.guid === candidate.guid"
                  class="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 text-[10px] font-bold uppercase tracking-wider"
                >
                  ✓ Selected
                </span>
                <span class="text-[11px] font-mono text-zinc-400">
                  {{ candidate.indexer }}
                </span>
                <span
                  v-if="candidate.isPreferred"
                  class="px-2 py-0.5 rounded bg-teal-950/80 border border-teal-700/80 text-teal-300 text-[10px] font-bold uppercase tracking-wider"
                  data-testid="badge-preferred-candidate"
                >
                  ⭐ Preferred
                </span>
                <span
                  v-if="candidate.isPrivateTracker"
                  class="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[10px] font-bold uppercase tracking-wider"
                  title="Private tracker — cloud streaming barred"
                  data-testid="badge-private-tracker"
                >
                  🔒 Private
                </span>
                <span
                  v-else-if="candidate.isInfringing"
                  class="px-2 py-0.5 rounded bg-red-950/80 border border-red-700/80 text-red-300 text-[10px] font-bold tracking-wider flex items-center gap-1"
                  title="Real-Debrid DMCA takedown — streaming blocked"
                  data-testid="badge-dmca-blocked-label"
                >
                  🚫 DMCA Blocked
                </span>
                <span
                  v-else-if="isStreamingEnabled && getCandidateCacheStatus(candidate) === true"
                  class="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-bold tracking-wider flex items-center gap-1"
                  title="Cached in Real-Debrid — ready for instant stream"
                  data-testid="badge-instant-cached"
                >
                  ⚡ Instant Stream
                </span>
              </div>
              <h5
                class="text-xs font-mono text-zinc-200 group-hover:text-white transition break-all leading-snug"
                :title="candidate.title"
              >
                {{ candidate.title }}
              </h5>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <span
                v-if="candidate.isInfringing"
                class="px-2.5 py-1 rounded text-xs font-medium bg-red-950/60 border border-red-800/60 text-red-400 flex items-center gap-1 cursor-not-allowed"
                title="This release has been taken down on Real-Debrid (DMCA infringing file)"
                data-testid="badge-dmca-blocked"
              >
                <span>🚫</span>
                <span>DMCA Blocked</span>
              </span>
              <button
                v-else-if="isStreamingEnabled && !candidate.isPrivateTracker"
                type="button"
                class="px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer flex items-center gap-1"
                :class="getCandidateCacheStatus(candidate) === true
                  ? 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'"
                title="Stream instantly via cloud debrid"
                data-testid="button-instant-stream"
                @click.stop="$emit('handleInstantStreamCandidate', candidate)"
              >
                <span>⚡</span>
                <span>{{ getCandidateCacheStatus(candidate) === true ? 'Instant Stream' : 'Stream' }}</span>
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded text-xs font-medium border transition cursor-pointer"
                :class="selectedRelease?.guid === candidate.guid
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 group-hover:bg-zinc-700 group-hover:text-white'"
              >
                {{ selectedRelease?.guid === candidate.guid ? 'Selected' : 'Choose' }}
              </button>
            </div>
          </div>

          <!-- Metadata Badges -->
          <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span class="px-2 py-0.5 rounded bg-zinc-800 text-emerald-300 border border-zinc-700 font-medium">
              {{ candidate.resolution }}
            </span>
            <span
              v-if="candidate.codec !== 'unknown'"
              class="px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700 font-medium"
            >
              {{ candidate.codec }}
            </span>
            <span
              v-if="candidate.source !== 'unknown'"
              class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase"
            >
              {{ candidate.source }}
            </span>
            <span class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
              {{ candidate.formattedSize }}
            </span>
            <span
              class="px-2 py-0.5 rounded border font-medium flex items-center gap-1"
              :class="candidate.isLowHealth
                ? 'bg-amber-950/50 border-amber-800/60 text-amber-300'
                : 'bg-zinc-800 border-zinc-700 text-emerald-400'"
            >
              <span>{{ candidate.seeders }} seeders</span>
              <span class="text-zinc-500">•</span>
              <span>{{ candidate.leechers }} leechers</span>
            </span>
            <span class="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono text-[10px] ml-auto">
              Score: {{ candidate.score }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReleaseCandidate, CandidateSortOption } from '../../lib/releaseExplorer';

defineProps<{
  releaseCandidates: ReleaseCandidate[];
  selectedRelease: ReleaseCandidate | null;
  recommendedRelease: ReleaseCandidate | null;
  isExplorerExpanded: boolean;
  candidateSortBy: CandidateSortOption;
  sortOptions: readonly { value: CandidateSortOption; label: string }[];
  hideInfringing: boolean;
  infringingCount: number;
  sortedReleaseCandidates: ReleaseCandidate[];
  isStreamingEnabled: boolean;
  getCandidateCacheStatus: (c: ReleaseCandidate) => boolean | undefined;
}>();

defineEmits<{
  (e: 'update:isExplorerExpanded', val: boolean): void;
  (e: 'update:candidateSortBy', val: CandidateSortOption): void;
  (e: 'update:hideInfringing', val: boolean): void;
  (e: 'selectRelease', candidate: ReleaseCandidate): void;
  (e: 'handleInstantStreamCandidate', candidate: ReleaseCandidate): void;
}>();
</script>
