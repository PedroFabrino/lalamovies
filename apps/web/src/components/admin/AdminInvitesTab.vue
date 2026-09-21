<template>
  <div>
    <!-- Pending Invites Section -->
    <div>
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-white">
          Pending & Recent Invites
        </h2>
        <p class="text-xs text-zinc-400">
          Single-use invite links generated for friends.
        </p>
      </div>

      <div
        v-if="isLoadingInvites"
        class="h-32 bg-zinc-900/60 border border-zinc-800 rounded-xl animate-pulse"
      />

      <div
        v-else-if="invitesList.length === 0"
        class="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 text-center text-sm text-zinc-500"
      >
        No active or recent invites. Click "Invite Friend" above to generate one.
      </div>

      <div
        v-else
        class="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-lg"
      >
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <th class="py-3 px-4 sm:px-6">
                Invite Token
              </th>
              <th class="py-3 px-4">
                Role
              </th>
              <th class="py-3 px-4">
                Status
              </th>
              <th class="py-3 px-4">
                Expires
              </th>
              <th class="py-3 px-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/70 text-zinc-200">
            <tr
              v-for="inv in invitesList"
              :key="inv.id"
              class="hover:bg-zinc-800/30 transition"
            >
              <td class="py-3 px-4 sm:px-6 font-mono text-xs text-zinc-300">
                {{ inv.token.slice(0, 16) }}...
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border"
                  :class="inv.role === 'trusted'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'"
                >
                  {{ inv.role || 'user' }}
                </span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                  :class="inv.status === 'used'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                    : inv.status === 'expired'
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      : 'bg-amber-950/60 text-amber-400 border-amber-800'"
                >
                  {{ inv.status }}
                </span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-xs text-zinc-400">
                {{ formatDate(inv.expiresAt) }}
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-right">
                <button
                  v-if="inv.status === 'pending'"
                  type="button"
                  class="px-2.5 py-1 text-xs font-medium bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800 rounded-lg transition cursor-pointer"
                  @click="$emit('revokeInvite', inv.token)"
                >
                  Revoke
                </button>
                <span
                  v-else
                  class="text-xs text-zinc-600"
                >—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Invite Generation Modal -->
    <div
      v-if="showInviteModal"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5">
        <div>
          <h3 class="text-lg font-semibold text-white">
            Invite a Friend
          </h3>
          <p class="text-xs text-zinc-400 mt-1">
            Generates a single-use registration link that automatically creates their account on Jellyfin.
          </p>
        </div>

        <div
          v-if="generatedInviteUrl"
          class="space-y-4"
        >
          <div class="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span class="text-xs text-zinc-400 block mb-1">Share this invite link:</span>
            <input
              type="text"
              readonly
              :value="generatedInviteUrl"
              class="w-full bg-transparent text-xs text-white font-mono select-all focus:outline-none"
            >
          </div>

          <div class="flex items-center justify-between gap-3">
            <button
              type="button"
              class="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              @click="$emit('closeInviteModal')"
            >
              Close
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
              @click="$emit('copyInviteUrl')"
            >
              <span>{{ hasCopiedInvite ? 'Copied to Clipboard!' : 'Copy Link' }}</span>
            </button>
          </div>
        </div>

        <div
          v-else
          class="space-y-4"
        >
          <div>
            <label
              for="inviteRole"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Role
            </label>
            <select
              id="inviteRole"
              :value="inviteRole"
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @change="$emit('update:inviteRole', ($event.target as HTMLSelectElement).value as 'user' | 'trusted')"
            >
              <option value="user">
                User
              </option>
              <option value="trusted">
                Trusted
              </option>
            </select>
            <p class="text-[11px] text-zinc-500 mt-1">
              Trusted users can view and request sensitive private media.
            </p>
          </div>

          <div>
            <label
              for="expiryHours"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Link Expiration
            </label>
            <select
              id="expiryHours"
              :value="inviteExpiryHours"
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @change="$emit('update:inviteExpiryHours', parseInt(($event.target as HTMLSelectElement).value, 10))"
            >
              <option :value="24">
                24 Hours
              </option>
              <option :value="48">
                48 Hours
              </option>
              <option :value="168">
                7 Days
              </option>
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
              @click="$emit('closeInviteModal')"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isGeneratingInvite"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              @click="$emit('createInvite')"
            >
              <svg
                v-if="isGeneratingInvite"
                class="animate-spin h-3.5 w-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>{{ isGeneratingInvite ? 'Generating...' : 'Create Invite Link' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface InviteItem {
  id: string;
  token: string;
  role: 'user' | 'trusted';
  createdByUserId: string;
  creatorUsername: string;
  expiresAt: string;
  usedAt: string | null;
  status: 'pending' | 'used' | 'expired';
}

defineProps<{
  invitesList: InviteItem[];
  isLoadingInvites: boolean;
  showInviteModal: boolean;
  inviteRole: 'user' | 'trusted';
  inviteExpiryHours: number;
  isGeneratingInvite: boolean;
  generatedInviteUrl: string | null;
  hasCopiedInvite: boolean;
  formatDate: (date: string) => string;
}>();

defineEmits<{
  (e: 'revokeInvite', token: string): void;
  (e: 'closeInviteModal'): void;
  (e: 'update:inviteRole', val: 'user' | 'trusted'): void;
  (e: 'update:inviteExpiryHours', val: number): void;
  (e: 'createInvite'): void;
  (e: 'copyInviteUrl'): void;
}>();
</script>
