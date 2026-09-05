<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <Navbar />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-white">
          Administration Panel
        </h1>
        <p class="text-sm text-zinc-400 mt-1">
          Manage server users, invite friends, configure system thresholds, and review storage cleanup.
        </p>
      </div>

      <!-- Tab Navigation -->
      <div class="flex border-b border-zinc-800 mb-8 gap-2">
        <button
          type="button"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer"
          :class="activeTab === 'users'
            ? 'border-indigo-500 text-white font-semibold'
            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'"
          @click="activeTab = 'users'"
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span>Users & Invites</span>
        </button>

        <button
          type="button"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer"
          :class="activeTab === 'config'
            ? 'border-indigo-500 text-white font-semibold'
            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'"
          @click="activeTab = 'config'"
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>System Config</span>
        </button>

        <button
          type="button"
          class="px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer"
          :class="activeTab === 'cleanup'
            ? 'border-indigo-500 text-white font-semibold'
            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'"
          @click="activeTab = 'cleanup'"
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
          <span>Disk & Cleanup</span>
        </button>
      </div>

      <!-- ================= TAB 1: USERS & INVITES ================= -->
      <div
        v-if="activeTab === 'users'"
        class="space-y-8"
      >
        <!-- Users Section -->
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
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg shadow transition flex items-center gap-2 cursor-pointer"
              @click="openInviteModal"
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
                        v-if="user.id === authStore.user?.id"
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
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'"
                    >
                      {{ user.role }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-400">
                    {{ formatDate(user.createdAt) }}
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap text-right">
                    <div class="flex items-center justify-end gap-2">
                      <!-- Role Toggle -->
                      <button
                        v-if="user.id !== authStore.user?.id"
                        type="button"
                        class="px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer disabled:opacity-50"
                        :class="user.role === 'admin'
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                          : 'bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border-indigo-800'"
                        :disabled="isTogglingRole === user.id"
                        @click="handleToggleRole(user)"
                      >
                        {{ user.role === 'admin' ? 'Demote to User' : 'Promote to Admin' }}
                      </button>

                      <!-- Delete User -->
                      <button
                        v-if="user.id !== authStore.user?.id"
                        type="button"
                        class="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                        title="Delete User from DB"
                        @click="confirmDeleteUser(user)"
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
                      @click="handleRevokeInvite(inv.token)"
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
      </div>

      <!-- ================= TAB 2: SYSTEM CONFIG ================= -->
      <div
        v-else-if="activeTab === 'config'"
        class="max-w-2xl"
      >
        <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
          <div class="mb-6">
            <h2 class="text-lg font-semibold text-white">
              System Settings
            </h2>
            <p class="text-xs text-zinc-400 mt-0.5">
              Tune download concurrency, cleanup thresholds, and third-party integrations.
            </p>
          </div>

          <!-- Alert -->
          <div
            v-if="configSuccessMessage"
            class="mb-6 p-4 bg-emerald-950/50 border border-emerald-800 rounded-lg text-sm text-emerald-200 flex items-center gap-3"
          >
            <svg
              class="w-5 h-5 text-emerald-400 shrink-0"
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
            <span>{{ configSuccessMessage }}</span>
          </div>

          <div
            v-if="configErrorMessage"
            class="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg text-sm text-red-200 flex items-center gap-3"
          >
            <svg
              class="w-5 h-5 text-red-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{{ configErrorMessage }}</span>
          </div>

          <form
            class="space-y-6"
            @submit.prevent="handleSaveConfig"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label
                  for="storage_quota_gb"
                  class="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Storage Quota (GB)
                </label>
                <input
                  id="storage_quota_gb"
                  v-model.number="configForm.storage_quota_gb"
                  type="number"
                  min="1"
                  step="1"
                  required
                  class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                <p class="text-[11px] text-zinc-500 mt-1">
                  Media stack quota allocation
                </p>
              </div>

              <div>
                <label
                  for="concurrent_limit"
                  class="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Max Concurrent Downloads
                </label>
                <input
                  id="concurrent_limit"
                  v-model.number="configForm.concurrent_limit"
                  type="number"
                  min="1"
                  required
                  class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                <p class="text-[11px] text-zinc-500 mt-1">
                  Simultaneous active downloads
                </p>
              </div>

              <div>
                <label
                  for="disk_warn_threshold"
                  class="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Disk Warn Threshold (%)
                </label>
                <input
                  id="disk_warn_threshold"
                  v-model.number="configForm.disk_warn_threshold"
                  type="number"
                  min="1"
                  max="100"
                  required
                  class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                <p class="text-[11px] text-zinc-500 mt-1">
                  Triggers auto-cleanup scan
                </p>
              </div>

              <div>
                <label
                  for="disk_reject_threshold"
                  class="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Disk Reject Threshold (%)
                </label>
                <input
                  id="disk_reject_threshold"
                  v-model.number="configForm.disk_reject_threshold"
                  type="number"
                  min="1"
                  max="100"
                  required
                  class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                <p class="text-[11px] text-zinc-500 mt-1">
                  Rejects new requests
                </p>
              </div>
            </div>

            <div>
              <label
                for="discord_webhook_url"
                class="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Discord Webhook URL
              </label>
              <input
                id="discord_webhook_url"
                v-model="configForm.discord_webhook_url"
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
              <p class="text-[11px] text-zinc-500 mt-1">
                Receives download and 24h cleanup warning notifications.
              </p>
            </div>

            <div>
              <label
                for="tmdb_api_key"
                class="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                TMDB API Key
              </label>
              <div class="relative">
                <input
                  id="tmdb_api_key"
                  v-model="configForm.tmdb_api_key"
                  :type="showTmdbKey ? 'text' : 'password'"
                  placeholder="v3 auth key"
                  class="w-full px-3 py-2 pr-10 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                <button
                  type="button"
                  class="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  @click="showTmdbKey = !showTmdbKey"
                >
                  <span class="text-xs">{{ showTmdbKey ? 'Hide' : 'Show' }}</span>
                </button>
              </div>
            </div>

            <div class="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                :disabled="isSavingConfig"
                class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg
                  v-if="isSavingConfig"
                  class="animate-spin h-4 w-4 text-white"
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
                <span>{{ isSavingConfig ? 'Saving...' : 'Save Configuration' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ================= TAB 3: DISK & CLEANUP ================= -->
      <div
        v-else-if="activeTab === 'cleanup'"
        class="space-y-8"
      >
        <!-- Storage Quota & Media Footprint Card -->
        <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold text-white">
                  Media Storage Quota
                </h2>
                <span
                  v-if="diskInfo"
                  class="px-2 py-0.5 rounded text-xs font-medium border"
                  :class="diskInfo.quotaUsedPercent >= 100 || (diskInfo.percentFree <= diskInfo.rejectThreshold)
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : diskInfo.quotaUsedPercent >= 80 || (diskInfo.percentFree <= diskInfo.warnThreshold)
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'"
                >
                  {{
                    diskInfo.quotaUsedPercent >= 100
                      ? 'Quota Exceeded'
                      : diskInfo.quotaUsedPercent >= 80
                        ? 'Quota Warning'
                        : 'Healthy'
                  }}
                </span>
              </div>
              <p class="text-xs text-zinc-400 mt-0.5">
                Physical disk footprint of staging area and library (hardlinks deduplicated) against configured quota.
              </p>
            </div>
            <button
              type="button"
              class="text-xs text-indigo-400 hover:text-indigo-300 transition self-start sm:self-auto cursor-pointer"
              @click="activeTab = 'config'"
            >
              Configure Quota &rarr;
            </button>
          </div>

          <div
            v-if="diskInfo"
            class="space-y-3"
          >
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <div class="flex items-baseline gap-2">
                <span class="text-2xl font-bold text-white tracking-tight">
                  {{ diskInfo.storageFootprintGb }} GB
                </span>
                <span class="text-xs text-zinc-400">
                  used of <strong class="text-zinc-200">{{ diskInfo.storageQuotaGb }} GB</strong> quota
                </span>
              </div>
              <span class="text-sm font-semibold text-zinc-300">
                {{ diskInfo.quotaUsedPercent }}%
              </span>
            </div>

            <!-- Storage Quota Gauge Bar -->
            <div class="w-full bg-zinc-950 border border-zinc-800 rounded-full h-3.5 overflow-hidden p-0.5">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="diskInfo.quotaUsedPercent >= 100
                  ? 'bg-red-500'
                  : diskInfo.quotaUsedPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'"
                :style="{ width: `${Math.min(100, diskInfo.quotaUsedPercent)}%` }"
              />
            </div>

            <div class="flex justify-between text-[11px] text-zinc-500">
              <span>0 GB</span>
              <span class="text-amber-400">80% Warning ({{ (diskInfo.storageQuotaGb * 0.8).toFixed(0) }} GB)</span>
              <span>{{ diskInfo.storageQuotaGb }} GB</span>
            </div>

            <!-- Warning Alert Banner if near or over quota -->
            <div
              v-if="diskInfo.quotaUsedPercent >= 80"
              class="p-3 rounded-lg border text-xs flex items-start gap-2.5"
              :class="diskInfo.quotaUsedPercent >= 100
                ? 'bg-red-950/40 border-red-800 text-red-300'
                : 'bg-amber-950/40 border-amber-800 text-amber-300'"
            >
              <svg
                class="w-4 h-4 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <span class="font-semibold">
                  {{ diskInfo.quotaUsedPercent >= 100 ? 'Storage Quota Exceeded!' : 'Storage Quota Warning' }}
                </span>
                <p class="text-zinc-400 text-[11px] mt-0.5">
                  {{ diskInfo.quotaUsedPercent >= 100
                    ? 'Storage usage has exceeded the configured quota limit. Trigger cleanup or increase quota in System Config.'
                    : 'Storage usage has reached or passed 80% of configured quota. Consider cleaning old media.' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Disk Usage Card -->
        <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 shadow-xl">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold text-white">
                Media Disk Usage
              </h2>
              <p class="text-xs text-zinc-400">
                Monitored volume containing staging and library folders.
              </p>
            </div>
            <button
              type="button"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              :disabled="isRunningScan"
              @click="handleRunScan"
            >
              <svg
                v-if="isRunningScan"
                class="animate-spin h-4 w-4 text-white"
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
              <span>{{ isRunningScan ? 'Scanning...' : 'Run Cleanup Scan' }}</span>
            </button>
          </div>

          <div
            v-if="diskInfo"
            class="space-y-3"
          >
            <div class="flex items-center justify-between text-sm">
              <span class="text-zinc-300 font-medium">Free Storage: {{ diskInfo.percentFree }}%</span>
              <span class="text-zinc-400 text-xs">Used: {{ diskInfo.percentUsed }}%</span>
            </div>

            <!-- Progress Bar -->
            <div class="w-full bg-zinc-950 border border-zinc-800 rounded-full h-3 overflow-hidden">
              <div
                class="h-3 rounded-full transition-all duration-500"
                :class="diskInfo.percentFree <= diskInfo.rejectThreshold
                  ? 'bg-red-500'
                  : diskInfo.percentFree <= diskInfo.warnThreshold
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'"
                :style="{ width: `${diskInfo.percentUsed}%` }"
              />
            </div>

            <div class="flex justify-between text-[11px] text-zinc-500">
              <span>0%</span>
              <span class="text-amber-400">Warn Threshold: &lt; {{ diskInfo.warnThreshold }}% Free</span>
              <span class="text-red-400">Reject Threshold: &lt; {{ diskInfo.rejectThreshold }}% Free</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <!-- Scan feedback alert -->
        <div
          v-if="scanFeedback"
          class="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm flex items-center justify-between gap-3 text-zinc-200"
        >
          <span>{{ scanFeedback }}</span>
          <button
            type="button"
            class="text-zinc-400 hover:text-white"
            @click="scanFeedback = null"
          >
            Dismiss
          </button>
        </div>

        <!-- Cleanup Candidates Table -->
        <div>
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-white">
              Cleanup Candidates (LRU Order)
            </h2>
            <p class="text-xs text-zinc-400">
              Ranked in deletion priority: least recently played first, then oldest request. Items marked Keep are excluded.
            </p>
          </div>

          <div
            v-if="isLoadingCandidates"
            class="h-40 bg-zinc-900/60 border border-zinc-800 rounded-xl animate-pulse"
          />

          <div
            v-else-if="candidatesList.length === 0"
            class="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center text-sm text-zinc-500"
          >
            No items currently eligible for cleanup. All seeding items are protected or kept.
          </div>

          <div
            v-else
            class="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-lg"
          >
            <table class="w-full text-left border-collapse text-sm">
              <thead>
                <tr class="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  <th class="py-3 px-4 sm:px-6">
                    Media Title
                  </th>
                  <th class="py-3 px-4">
                    Type
                  </th>
                  <th class="py-3 px-4">
                    Last Played
                  </th>
                  <th class="py-3 px-4">
                    Size
                  </th>
                  <th class="py-3 px-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800/70 text-zinc-200">
                <tr
                  v-for="cand in candidatesList"
                  :key="cand.id"
                  class="hover:bg-zinc-800/30 transition"
                >
                  <td class="py-3.5 px-4 sm:px-6">
                    <div class="font-medium text-white">
                      {{ cand.title }}
                    </div>
                    <div class="text-xs text-zinc-500">
                      <span v-if="cand.year">{{ cand.year }}</span>
                      <span
                        v-if="cand.scheduledDeleteAt"
                        class="ml-2 text-amber-400 font-semibold"
                      >
                        Scheduled for deletion: {{ formatDate(cand.scheduledDeleteAt) }}
                      </span>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {{ formatMediaType(cand.mediaType) }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-400">
                    {{ cand.lastPlayedAt ? formatDate(cand.lastPlayedAt) : 'Never played' }}
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-zinc-400">
                    {{ formatSpeed(cand.sizeBytes || 0).replace('/s', '') }}
                  </td>
                  <td class="py-3.5 px-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs font-medium bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800 rounded-lg transition cursor-pointer"
                      @click="confirmCleanItem(cand)"
                    >
                      Clean Now
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

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
              @click="showInviteModal = false"
            >
              Close
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
              @click="copyInviteUrl"
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
              for="expiryHours"
              class="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Link Expiration
            </label>
            <select
              id="expiryHours"
              v-model.number="inviteExpiryHours"
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              @click="showInviteModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isGeneratingInvite"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              @click="handleCreateInvite"
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

    <!-- Action Confirmation Modal (Delete User / Clean Item) -->
    <div
      v-if="modalAction"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-red-400">
          <div class="w-10 h-10 rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center shrink-0">
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-white">
            {{ modalAction.title }}
          </h3>
        </div>

        <p class="text-sm text-zinc-300">
          {{ modalAction.message }}
        </p>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
            :disabled="modalAction.isExecuting"
            @click="modalAction = null"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            :disabled="modalAction.isExecuting"
            @click="modalAction.onConfirm"
          >
            <svg
              v-if="modalAction.isExecuting"
              class="animate-spin h-4 w-4 text-white"
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
            <span>{{ modalAction.isExecuting ? 'Processing...' : 'Confirm' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import Navbar from '../components/Navbar.vue';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { DownloadRequest } from '../stores/requests';
import { formatDate, formatMediaType, formatSpeed } from '../lib/formatters';

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: 'user' | 'admin';
  createdAt: string;
}

interface InviteItem {
  id: string;
  token: string;
  createdByUserId: string;
  creatorUsername: string | null;
  expiresAt: string;
  usedAt: string | null;
  status: 'used' | 'expired' | 'pending';
}

interface DiskInfo {
  percentFree: number;
  percentUsed: number;
  warnThreshold: number;
  rejectThreshold: number;
  storageQuotaGb: number;
  storageQuotaBytes: number;
  storageFootprintBytes: number;
  storageFootprintGb: number;
  quotaUsedPercent: number;
}

const authStore = useAuthStore();
const activeTab = ref<'users' | 'config' | 'cleanup'>('users');

// ================= Tab 1: Users & Invites State =================
const usersList = ref<AdminUser[]>([]);
const isLoadingUsers = ref(false);
const isTogglingRole = ref<string | null>(null);

const invitesList = ref<InviteItem[]>([]);
const isLoadingInvites = ref(false);

const showInviteModal = ref(false);
const inviteExpiryHours = ref(24);
const isGeneratingInvite = ref(false);
const generatedInviteUrl = ref<string | null>(null);
const hasCopiedInvite = ref(false);

// Action Modal
const modalAction = ref<{
  title: string;
  message: string;
  isExecuting: boolean;
  onConfirm: () => Promise<void>;
} | null>(null);

// ================= Tab 2: Config State =================
const isSavingConfig = ref(false);
const configSuccessMessage = ref<string | null>(null);
const configErrorMessage = ref<string | null>(null);
const showTmdbKey = ref(false);

const configForm = reactive({
  storage_quota_gb: 150,
  concurrent_limit: 2,
  disk_warn_threshold: 20,
  disk_reject_threshold: 15,
  discord_webhook_url: '',
  tmdb_api_key: '',
});

// ================= Tab 3: Cleanup State =================
const diskInfo = ref<DiskInfo | null>(null);
const candidatesList = ref<DownloadRequest[]>([]);
const isLoadingCandidates = ref(false);
const isRunningScan = ref(false);
const scanFeedback = ref<string | null>(null);

// ================= Lifecycle & Fetchers =================
onMounted(async () => {
  await Promise.all([
    loadUsers(),
    loadInvites(),
    loadConfig(),
    loadDiskAndCandidates(),
  ]);
});

async function loadUsers() {
  isLoadingUsers.value = true;
  try {
    const data = await api.get<{ users: AdminUser[] }>('/admin/users');
    usersList.value = data.users;
  } catch {
    // handled
  } finally {
    isLoadingUsers.value = false;
  }
}

async function loadInvites() {
  isLoadingInvites.value = true;
  try {
    const data = await api.get<{ invites: InviteItem[] }>('/invites');
    invitesList.value = data.invites;
  } catch {
    // handled
  } finally {
    isLoadingInvites.value = false;
  }
}

async function handleToggleRole(targetUser: AdminUser) {
  const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
  isTogglingRole.value = targetUser.id;
  try {
    const data = await api.patch<{ user: AdminUser }>(`/admin/users/${targetUser.id}/role`, {
      role: newRole,
    });
    targetUser.role = data.user.role;
  } catch {
    // handled
  } finally {
    isTogglingRole.value = null;
  }
}

function confirmDeleteUser(targetUser: AdminUser) {
  modalAction.value = {
    title: 'Delete User Record?',
    message: `Are you sure you want to remove user "${targetUser.username}" from the database? Their Jellyfin account will remain intact.`,
    isExecuting: false,
    onConfirm: async () => {
      if (!modalAction.value) return;
      modalAction.value.isExecuting = true;
      try {
        await api.delete(`/admin/users/${targetUser.id}`);
        usersList.value = usersList.value.filter((u) => u.id !== targetUser.id);
        modalAction.value = null;
      } catch {
        if (modalAction.value) {
          modalAction.value.isExecuting = false;
        }
      }
    },
  };
}

function openInviteModal() {
  generatedInviteUrl.value = null;
  hasCopiedInvite.value = false;
  inviteExpiryHours.value = 24;
  showInviteModal.value = true;
}

async function handleCreateInvite() {
  isGeneratingInvite.value = true;
  try {
    const data = await api.post<{ invite: InviteItem; url: string }>('/invites', {
      expiresInHours: inviteExpiryHours.value,
    });
    // Build public invite URL using current origin
    generatedInviteUrl.value = `${window.location.origin}/invite/${data.invite.token}`;
    await loadInvites();
  } catch {
    // handled
  } finally {
    isGeneratingInvite.value = false;
  }
}

async function copyInviteUrl() {
  if (!generatedInviteUrl.value) return;
  try {
    await navigator.clipboard.writeText(generatedInviteUrl.value);
    hasCopiedInvite.value = true;
    setTimeout(() => {
      hasCopiedInvite.value = false;
    }, 2500);
  } catch {
    // fallback
  }
}

async function handleRevokeInvite(token: string) {
  try {
    await api.delete(`/invites/${token}`);
    invitesList.value = invitesList.value.filter((i) => i.token !== token);
  } catch {
    // handled
  }
}

// ================= Config Handlers =================
async function loadConfig() {
  try {
    const data = await api.get<{ config: Record<string, string> }>('/admin/config');
    const c = data.config;
    if (c.storage_quota_gb) configForm.storage_quota_gb = parseInt(c.storage_quota_gb, 10);
    if (c.concurrent_limit) configForm.concurrent_limit = parseInt(c.concurrent_limit, 10);
    if (c.disk_warn_threshold) configForm.disk_warn_threshold = parseInt(c.disk_warn_threshold, 10);
    if (c.disk_reject_threshold) configForm.disk_reject_threshold = parseInt(c.disk_reject_threshold, 10);
    if (c.discord_webhook_url) configForm.discord_webhook_url = c.discord_webhook_url;
    if (c.tmdb_api_key) configForm.tmdb_api_key = c.tmdb_api_key;
  } catch {
    // handled
  }
}

async function handleSaveConfig() {
  isSavingConfig.value = true;
  configSuccessMessage.value = null;
  configErrorMessage.value = null;

  try {
    await api.put('/admin/config', configForm);
    configSuccessMessage.value = 'Settings saved successfully.';
    await loadDiskAndCandidates();
    setTimeout(() => {
      configSuccessMessage.value = null;
    }, 4000);
  } catch (err) {
    if (err instanceof ApiError) {
      configErrorMessage.value = err.message;
    } else {
      configErrorMessage.value = 'Failed to save configuration.';
    }
  } finally {
    isSavingConfig.value = false;
  }
}

// ================= Cleanup Handlers =================
async function loadDiskAndCandidates() {
  isLoadingCandidates.value = true;
  try {
    const [diskData, candData] = await Promise.all([
      api.get<DiskInfo>('/admin/disk'),
      api.get<{ candidates: DownloadRequest[] }>('/admin/cleanup/candidates'),
    ]);
    diskInfo.value = diskData;
    candidatesList.value = candData.candidates;
  } catch {
    // handled
  } finally {
    isLoadingCandidates.value = false;
  }
}

async function handleRunScan() {
  isRunningScan.value = true;
  scanFeedback.value = null;

  try {
    const data = await api.post<{ scheduled: DownloadRequest[] }>('/admin/cleanup');
    if (data.scheduled.length > 0) {
      scanFeedback.value = `Cleanup scan completed: scheduled ${data.scheduled.length} item(s) for deletion.`;
    } else {
      scanFeedback.value = 'Cleanup scan completed: disk space is healthy, no items scheduled.';
    }
    await loadDiskAndCandidates();
  } catch {
    scanFeedback.value = 'Failed to run cleanup scan.';
  } finally {
    isRunningScan.value = false;
  }
}

function confirmCleanItem(cand: DownloadRequest) {
  modalAction.value = {
    title: 'Clean Item Immediately?',
    message: `Are you sure you want to clean "${cand.title}" now? This will remove files and torrent immediately without the 24-hour waiting period.`,
    isExecuting: false,
    onConfirm: async () => {
      if (!modalAction.value) return;
      modalAction.value.isExecuting = true;
      try {
        await api.post(`/admin/cleanup/${cand.id}`);
        candidatesList.value = candidatesList.value.filter((c) => c.id !== cand.id);
        modalAction.value = null;
        await loadDiskAndCandidates();
      } catch {
        if (modalAction.value) {
          modalAction.value.isExecuting = false;
        }
      }
    },
  };
}
</script>
