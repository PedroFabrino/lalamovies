<template>
  <div
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-white">
            Invite Friends
          </h3>
          <p class="text-xs text-zinc-400 mt-0.5">
            Share your personal invite link to let friends join the media server.
          </p>
        </div>
        <button
          type="button"
          class="text-zinc-500 hover:text-zinc-300 p-1 transition"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Invites Disabled for this Account -->
      <div
        v-if="isInvitesDisabledForUser"
        class="p-4 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-200 space-y-1"
      >
        <div class="font-medium text-amber-100 flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Invite Generation Disabled</span>
        </div>
        <p class="text-amber-300/80">
          Invite link generation has been disabled for your account by an administrator.
        </p>
      </div>

      <!-- Loading State -->
      <div
        v-else-if="isLoading"
        class="py-8 flex flex-col items-center justify-center gap-2"
      >
        <svg
          class="animate-spin h-6 w-6 text-indigo-500"
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
        <span class="text-xs text-zinc-400">Loading your invite link...</span>
      </div>

      <!-- Active Invite Section -->
      <div
        v-else
        class="space-y-4"
      >
        <!-- Error notification -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-200"
        >
          {{ errorMessage }}
        </div>

        <div v-if="inviteUrl">
          <label class="block text-xs font-medium text-zinc-300 mb-1.5">
            Your Personal Invite Link
          </label>
          <div class="flex items-center gap-2">
            <input
              type="text"
              readonly
              :value="inviteUrl"
              class="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white font-mono select-all focus:outline-none focus:border-zinc-700"
            >
            <button
              type="button"
              class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition shrink-0 cursor-pointer"
              @click="copyInviteUrl"
            >
              {{ hasCopied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <p class="text-[11px] text-zinc-500 mt-1.5">
            Multi-use link. Does not expire. Anyone with this link can create a regular user account.
          </p>
        </div>

        <!-- No active invite -->
        <div
          v-else
          class="p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-center"
        >
          <p class="text-xs text-zinc-400 mb-3">
            You do not currently have an active invite link.
          </p>
          <button
            type="button"
            :disabled="isGenerating"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
            @click="generateLink"
          >
            {{ isGenerating ? 'Generating...' : 'Generate Invite Link' }}
          </button>
        </div>

        <!-- Friends joined section -->
        <div class="pt-2 border-t border-zinc-800">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-zinc-300">Friends Joined ({{ invitedUsers.length }})</span>
          </div>

          <div
            v-if="invitedUsers.length === 0"
            class="text-xs text-zinc-500 italic py-1"
          >
            No friends have registered with your link yet.
          </div>
          <div
            v-else
            class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto"
          >
            <span
              v-for="user in invitedUsers"
              :key="user"
              class="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-zinc-800 border border-zinc-700 text-zinc-300"
            >
              @{{ user }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-zinc-800">
          <button
            v-if="inviteUrl"
            type="button"
            :disabled="isGenerating"
            class="text-xs text-red-400 hover:text-red-300 transition cursor-pointer disabled:opacity-50"
            @click="generateLink"
          >
            {{ isGenerating ? 'Updating...' : 'Revoke & Create New Link' }}
          </button>
          <div v-else />

          <button
            type="button"
            class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
            @click="$emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, ApiError } from '../lib/api';

defineEmits<{
  (e: 'close'): void;
}>();

const isLoading = ref(true);
const isGenerating = ref(false);
const isInvitesDisabledForUser = ref(false);
const inviteUrl = ref<string | null>(null);
const invitedUsers = ref<string[]>([]);
const hasCopied = ref(false);
const errorMessage = ref<string | null>(null);

async function loadMyLink() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const data = await api.get<{
      invite: { id: string; token: string; role: string; expiresAt: string | null } | null;
      url: string | null;
      invitedUsers: string[];
    }>('/invites/my-link');
    inviteUrl.value = data.url;
    invitedUsers.value = data.invitedUsers || [];
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 403) {
      isInvitesDisabledForUser.value = true;
    } else {
      errorMessage.value = (err as Error).message || 'Failed to load invite link';
    }
  } finally {
    isLoading.value = false;
  }
}

async function generateLink() {
  isGenerating.value = true;
  errorMessage.value = null;
  try {
    const data = await api.post<{
      invite: { id: string; token: string; role: string };
      url: string;
    }>('/invites', {});
    inviteUrl.value = data.url;
    hasCopied.value = false;
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 403) {
      isInvitesDisabledForUser.value = true;
    } else {
      errorMessage.value = (err as Error).message || 'Failed to generate invite link';
    }
  } finally {
    isGenerating.value = false;
  }
}

async function copyInviteUrl() {
  if (!inviteUrl.value) return;
  try {
    await navigator.clipboard.writeText(inviteUrl.value);
    hasCopied.value = true;
    setTimeout(() => {
      hasCopied.value = false;
    }, 2000);
  } catch {
    // fallback
  }
}

onMounted(() => {
  loadMyLink();
});
</script>
