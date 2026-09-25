<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold text-white">
          Registered Users
        </h2>
        <p class="text-xs text-zinc-400">
          All local accounts connected to Jellyfin.
        </p>
      </div>
      <button
        type="button"
        :disabled="!isInvitesEnabled"
        :title="!isInvitesEnabled ? 'User invites are disabled' : ''"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        @click="$emit('openInviteModal')"
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
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
        <span>Invite Friend</span>
      </button>
    </div>

    <!-- User Action Error Alert -->
    <div
      v-if="userActionError"
      class="mb-4 p-3.5 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-200 flex items-center justify-between"
    >
      <span>{{ userActionError }}</span>
      <button
        type="button"
        class="text-zinc-400 hover:text-white"
        @click="$emit('clearError')"
      >
        ✕
      </button>
    </div>

    <!-- Loading Users -->
    <div
      v-if="isLoadingUsers"
      class="h-40 bg-zinc-900/60 border border-zinc-800 rounded-xl animate-pulse"
    />

    <!-- Users Table -->
    <div
      v-else
      class="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-lg"
    >
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <th class="py-3 px-4 sm:px-6">
              Username
            </th>
            <th class="py-3 px-4">
              Role
            </th>
            <th class="py-3 px-4">
              Invited By
            </th>
            <th class="py-3 px-4">
              Invites
            </th>
            <th class="py-3 px-4">
              Joined
            </th>
            <th class="py-3 px-4 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-800/70 text-zinc-200">
          <tr
            v-for="user in usersList"
            :key="user.id"
            class="hover:bg-zinc-800/30 transition"
          >
            <td class="py-3.5 px-4 sm:px-6">
              <div class="font-medium text-white flex items-center gap-2">
                <span>{{ user.username }}</span>
                <span
                  v-if="user.id === authUserId"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700"
                >
                  You
                </span>
              </div>
              <div class="text-xs text-zinc-500">
                {{ user.email || 'No email set' }}
              </div>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border"
                :class="user.role === 'admin'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : user.role === 'trusted'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'"
              >
                {{ user.role }}
              </span>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-400">
              <span
                v-if="user.invitedBy"
                class="text-indigo-400 font-medium"
              >@{{ user.invitedBy }}</span>
              <span
                v-else
                class="text-zinc-600"
              >—</span>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <button
                v-if="user.role !== 'admin'"
                type="button"
                class="px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer"
                :class="user.invitesEnabled !== false
                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800 hover:bg-emerald-900/50'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700/50'"
                :title="user.invitesEnabled !== false ? 'Click to disable invite generation' : 'Click to enable invite generation'"
                @click="$emit('toggleInvites', user, user.invitesEnabled === false)"
              >
                {{ user.invitesEnabled !== false ? 'Allowed' : 'Disabled' }}
              </button>
              <span
                v-else
                class="text-[11px] text-zinc-500"
              >Always</span>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-400">
              {{ formatDate(user.createdAt) }}
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap text-right">
              <div class="flex items-center justify-end gap-2">
                <!-- Role Select -->
                <select
                  v-if="user.id !== authUserId"
                  :value="user.role"
                  :disabled="isTogglingRole === user.id"
                  class="px-2.5 py-1 text-xs font-medium rounded-lg border bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 transition cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  @change="$emit('changeRole', user, ($event.target as HTMLSelectElement).value as 'user' | 'trusted' | 'admin')"
                >
                  <option value="user">
                    User
                  </option>
                  <option value="trusted">
                    Trusted
                  </option>
                  <option value="admin">
                    Admin
                  </option>
                </select>

                <!-- Delete User -->
                <button
                  v-if="user.id !== authUserId"
                  type="button"
                  class="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                  title="Delete User from DB"
                  @click="$emit('deleteUser', user)"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface AdminUser {
  id: string;
  username: string;
  role: 'admin' | 'trusted' | 'user';
  email: string | null;
  createdAt: string;
  invitedBy?: string | null;
  invitesEnabled?: boolean;
}

defineProps<{
  usersList: AdminUser[];
  isLoadingUsers: boolean;
  isTogglingRole: string | null;
  userActionError: string | null;
  authUserId?: string;
  isInvitesEnabled: boolean;
  formatDate: (date: string) => string;
}>();

defineEmits<{
  (e: 'changeRole', user: AdminUser, newRole: 'user' | 'trusted' | 'admin'): void;
  (e: 'toggleInvites', user: AdminUser, enabled: boolean): void;
  (e: 'deleteUser', user: AdminUser): void;
  (e: 'openInviteModal'): void;
  (e: 'clearError'): void;
}>();
</script>
