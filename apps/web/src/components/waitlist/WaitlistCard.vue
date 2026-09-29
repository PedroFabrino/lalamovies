<template>
  <div
    data-testid="waitlist-card"
    class="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between gap-4 transition hover:border-zinc-700"
  >
    <div class="flex gap-4">
      <!-- Poster -->
      <div class="w-20 h-28 shrink-0 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800/60 flex items-center justify-center relative">
        <img
          v-if="entry.posterUrl"
          :src="entry.posterUrl"
          :alt="entry.title"
          class="w-full h-full object-cover"
          loading="lazy"
        >
        <div
          v-else
          class="text-2xl text-zinc-600"
        >
          {{ getMediaTypeIcon(entry.mediaType) }}
        </div>
      </div>

      <!-- Details -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3
            class="text-sm font-semibold text-white truncate"
            :title="entry.title"
            data-testid="entry-title"
          >
            {{ entry.title }}
          </h3>
        </div>

        <div class="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
          <span v-if="entry.year">{{ entry.year }}</span>
          <span
            v-if="entry.year"
            class="text-zinc-600"
          >•</span>
          <span
            class="px-1.5 py-0.5 rounded text-[10px] font-medium border"
            :class="getMediaTypeBadgeClasses(entry.mediaType)"
            data-testid="entry-media-type"
          >
            {{ formatMediaType(entry.mediaType) }}
          </span>
          <span
            v-if="entry.seasonNumber"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700"
            data-testid="entry-season-badge"
          >S{{ entry.seasonNumber < 10 ? `0${entry.seasonNumber}` : entry.seasonNumber }}<template v-if="entry.targetEpisode">E{{ entry.targetEpisode < 10 ? `0${entry.targetEpisode}` : entry.targetEpisode }}</template></span>
          <span
            v-if="entry.tmdbReleaseDate"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-amber-300 border border-amber-800/50 flex items-center gap-1"
            data-testid="entry-release-date-badge"
            :title="entry.status === 'pending_release' ? `Starts looking for torrents on ${formatDateOnly(entry.tmdbReleaseDate)}` : `Released on ${formatDateOnly(entry.tmdbReleaseDate)}`"
          >
            <span>📅</span>
            <span>{{ formatDateOnly(entry.tmdbReleaseDate) }}</span>
          </span>
          <span
            v-else
            class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-amber-300 border border-amber-800/50 flex items-center gap-1"
            data-testid="entry-release-date-badge"
            title="Release date to be announced"
          >
            <span>📅</span>
            <span>Date TBA</span>
          </span>
          <span
            v-if="entry.requesterUsername"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1"
            data-testid="entry-requester"
          >
            <span>👤</span>
            <span>{{ entry.requesterUsername }}</span>
          </span>
          <span
            v-if="entry.coRequesterCount && entry.coRequesterCount > 0"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-950/80 text-blue-300 border border-blue-800/60 flex items-center gap-1"
            data-testid="entry-co-requester-count"
            :title="`${entry.coRequesterCount} co-requester${entry.coRequesterCount > 1 ? 's' : ''}`"
          >
            <span>👥</span>
            <span>+{{ entry.coRequesterCount }}</span>
          </span>
        </div>

        <!-- Status badge -->
        <div class="mt-3">
          <span
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
            :class="getStatusBadgeClasses(entry.status)"
            data-testid="entry-status-badge"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="getStatusDotClasses(entry.status)"
            />
            <span>{{ formatStatusText(entry, now) }}</span>
          </span>
        </div>

        <!-- Extra Context Info -->
        <p class="text-[11px] text-zinc-400 mt-2 line-clamp-2">
          <template v-if="entry.status === 'pending_release'">
            <span
              v-if="entry.tmdbReleaseDate"
              class="text-amber-300/90 font-medium"
            >
              ⏳ Unreleased • Starts searching trackers on {{ formatDateOnly(entry.tmdbReleaseDate) }}
            </span>
            <span v-else>No release date announced as of yet • Checking APIs for updates</span>
          </template>
          <template v-else-if="entry.status === 'checking'">
            <span
              v-if="entry.lastCheckResult"
              class="text-sky-300/90 font-medium"
              data-testid="entry-diagnostic"
            >
              {{ entry.lastCheckResult }}
            </span>
            <span v-else-if="entry.tmdbReleaseDate">Released {{ formatDateOnly(entry.tmdbReleaseDate) }} • Actively checking trackers</span>
            <span v-else>Checking trackers for quality release</span>
          </template>
          <template v-else-if="entry.status === 'notified'">
            <span
              v-if="entry.prowlarrReleaseTitle"
              class="text-indigo-300 font-mono text-[10px] block truncate"
            >
              {{ entry.prowlarrReleaseTitle }}
            </span>
            <span
              v-if="getRemainingGraceMs(entry, now) > 0"
              class="text-amber-300 font-medium flex items-center gap-1.5 mt-0.5"
            >
              <span>⏳ Auto-downloading in {{ formatGraceRemaining(getRemainingGraceMs(entry, now)) }}</span>
            </span>
            <span
              v-else
              class="text-amber-300 font-medium flex items-center gap-1.5 mt-0.5"
            >
              <span>⚡ Grace period ended • Queued for auto-download</span>
            </span>
          </template>
          <template v-else-if="entry.status === 'triggered'">
            <span class="text-emerald-300">Submitted to download queue</span>
          </template>
          <template v-else-if="entry.status === 'completed'">
            <span class="text-teal-300">All episodes/releases completed</span>
          </template>
          <template v-else-if="entry.status === 'cancelled'">
            <span class="text-zinc-500">Monitoring stopped</span>
          </template>
          <template v-else-if="entry.status === 'error'">
            <span class="text-red-400">Submission failed (exceeded retries)</span>
          </template>
        </p>
      </div>
    </div>

    <!-- Card footer / actions -->
    <div class="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs">
      <span class="text-zinc-500">
        Added {{ formatDateOnly(entry.createdAt) }}
      </span>

      <div class="flex items-center gap-1.5">
        <button
          v-if="entry.status === 'notified'"
          type="button"
          data-testid="approve-waitlist-btn"
          :disabled="isApproving"
          class="px-2.5 py-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded border border-emerald-800/60 hover:border-emerald-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
          @click.stop="$emit('approve', entry)"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': isApproving }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>{{ isApproving ? 'Approving...' : 'Approve Now' }}</span>
        </button>

        <button
          v-if="entry.status === 'pending_release' || entry.status === 'checking'"
          type="button"
          data-testid="check-now-btn"
          :disabled="isChecking"
          class="px-2.5 py-1 text-zinc-400 hover:text-indigo-300 hover:bg-indigo-950/30 rounded border border-transparent hover:border-indigo-900/50 transition cursor-pointer flex items-center gap-1 text-xs disabled:opacity-50"
          @click.stop="$emit('check', entry)"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': isChecking }"
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
          <span>{{ isChecking ? 'Checking...' : 'Check Now' }}</span>
        </button>

        <button
          v-if="entry.status !== 'cancelled' && entry.status !== 'completed'"
          type="button"
          data-testid="cancel-waitlist-btn"
          class="px-2.5 py-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded border border-transparent hover:border-red-900/50 transition cursor-pointer flex items-center gap-1"
          @click.stop="$emit('cancel', entry)"
        >
          <svg
            class="w-3.5 h-3.5"
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
          <span>Cancel</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WaitlistEntry } from '../../stores/waitlist';
import { formatMediaType } from '../../lib/formatters';
import {
  getRemainingGraceMs,
  formatGraceRemaining,
  getMediaTypeIcon,
  getMediaTypeBadgeClasses,
  getStatusBadgeClasses,
  getStatusDotClasses,
  formatStatusText,
  formatDateOnly,
} from './waitlistCardUtils';

withDefaults(
  defineProps<{
    entry: WaitlistEntry;
    isApproving?: boolean;
    isChecking?: boolean;
    now?: number;
  }>(),
  {
    isApproving: false,
    isChecking: false,
    now: () => Date.now(),
  }
);

defineEmits<{
  (e: 'approve', entry: WaitlistEntry): void;
  (e: 'check', entry: WaitlistEntry): void;
  (e: 'cancel', entry: WaitlistEntry): void;
}>();
</script>
