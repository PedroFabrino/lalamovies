<template>
  <div class="space-y-4">
    <!-- Loading skeleton -->
    <div
      v-if="loading && items.length === 0"
      class="space-y-3"
      data-testid="deleted-skeleton"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="h-16 bg-zinc-900/60 border border-zinc-800/80 rounded-xl animate-pulse"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="items.length === 0"
      class="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-12 text-center my-6"
      data-testid="deleted-empty-state"
    >
      <div class="w-12 h-12 mx-auto rounded-full bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-400 mb-3">
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-white mb-1">
        No Deleted Requests
      </h3>
      <p class="text-xs text-zinc-400 max-w-sm mx-auto">
        When requests are deleted manually or cleaned up to free disk space, they will be tracked here for audit and one-click re-downloading.
      </p>
    </div>

    <!-- Deleted Requests Table -->
    <div
      v-else
      class="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xl"
      data-testid="deleted-requests-table"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <th class="py-3 px-4 sm:px-6">
                Media
              </th>
              <th class="py-3 px-4">
                Type
              </th>
              <th class="py-3 px-4">
                Deletion Reason
              </th>
              <th class="py-3 px-4">
                Deleted Date
              </th>
              <th class="py-3 px-4">
                Library Status
              </th>
              <th class="py-3 px-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/60">
            <tr
              v-for="item in items"
              :key="item.id"
              class="hover:bg-zinc-800/30 transition group"
              data-testid="deleted-request-row"
            >
              <!-- Media title & info -->
              <td class="py-3.5 px-4 sm:px-6">
                <div>
                  <span class="font-medium text-white group-hover:text-indigo-300 transition text-sm">
                    {{ item.title }}
                  </span>
                  <span
                    v-if="item.year"
                    class="text-xs text-zinc-400 ml-1.5 font-normal"
                  >
                    ({{ item.year }})
                  </span>
                  <div
                    v-if="formatMediaSubtitle(item)"
                    class="text-xs text-indigo-400 font-mono mt-0.5"
                  >
                    {{ formatMediaSubtitle(item) }}
                  </div>
                  <div
                    v-if="item.requesterUsername"
                    class="text-[11px] text-zinc-500 mt-0.5"
                  >
                    Requested by {{ item.requesterUsername }}
                  </div>
                </div>
              </td>

              <!-- Type badge -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span
                  class="px-2 py-0.5 text-xs font-medium rounded-full"
                  :class="item.mediaType === 'private'
                    ? 'bg-purple-950/60 text-purple-300 border border-purple-800'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'"
                >
                  {{ formatMediaType(item.mediaType) }}
                </span>
              </td>

              <!-- Deletion reason badge -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span
                  v-if="item.deletionReason === 'cleanup'"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800"
                  data-testid="reason-cleanup-badge"
                >
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Space Cleanup</span>
                </span>
                <span
                  v-else-if="item.deletionReason === 'manual'"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700"
                  data-testid="reason-manual-badge"
                >
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>Manual Delete</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60"
                >
                  Deleted
                </span>
              </td>

              <!-- Deleted date -->
              <td class="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-400">
                <span :title="item.deletedAt || item.requestedAt">
                  {{ formatDate(item.deletedAt || item.requestedAt) }}
                </span>
              </td>

              <!-- Library / Active status -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span
                  v-if="item.isActiveOrPresent"
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                  data-testid="active-in-library-badge"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Active / In Library</span>
                </span>
                <span
                  v-else
                  class="text-xs text-zinc-500 font-normal"
                >
                  Not in library
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <button
                  type="button"
                  :disabled="item.isActiveOrPresent"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="item.isActiveOrPresent
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'"
                  :title="item.isActiveOrPresent ? 'Already active or present in library' : 'Re-download this title'"
                  data-testid="redownload-button"
                  @click="$emit('redownload', item)"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Redownload</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DownloadRequest } from '../../stores/requests';
import { formatMediaType, formatDate, formatMediaSubtitle } from '../../lib/formatters';

defineProps<{
  items: DownloadRequest[];
  loading?: boolean;
}>();

defineEmits<{
  (e: 'redownload', item: DownloadRequest): void;
}>();
</script>
