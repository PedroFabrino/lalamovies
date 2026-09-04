<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-white mb-2">
          Accept Invite
        </h1>
        <p class="text-sm text-zinc-400">
          Join the media server and start downloading
        </p>
      </div>

      <!-- Loading Initial Token Check -->
      <div
        v-if="isCheckingToken"
        class="py-12 flex flex-col items-center justify-center gap-3"
      >
        <svg
          class="animate-spin h-8 w-8 text-indigo-500"
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
        <span class="text-sm text-zinc-400">Verifying invite link...</span>
      </div>

      <!-- Invalid / Expired Token State -->
      <div
        v-else-if="!isTokenValid"
        class="text-center py-6"
      >
        <div class="w-12 h-12 rounded-full bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto mb-4">
          <svg
            class="w-6 h-6"
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
        </div>
        <h2 class="text-lg font-semibold text-white mb-2">
          Invite Unavailable
        </h2>
        <p class="text-sm text-zinc-400 mb-6">
          {{ tokenError || 'This invite link is invalid, expired, or has already been used.' }}
        </p>
        <router-link
          to="/login"
          class="inline-block px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition"
        >
          Return to Sign In
        </router-link>
      </div>

      <!-- Valid Token: Account Setup Form -->
      <form
        v-else
        class="space-y-5"
        @submit.prevent="handleAcceptInvite"
      >
        <!-- Error Alert -->
        <div
          v-if="submitError"
          class="p-4 bg-red-950/50 border border-red-800/80 rounded-lg text-sm text-red-200 flex items-start gap-3"
        >
          <svg
            class="w-5 h-5 text-red-400 shrink-0 mt-0.5"
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
          <span>{{ submitError }}</span>
        </div>

        <div>
          <label
            for="username"
            class="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            Choose Username
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            autocomplete="username"
            :disabled="isSubmitting"
            placeholder="e.g. alex"
            class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
          >
        </div>

        <div>
          <label
            for="password"
            class="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            Set Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            :disabled="isSubmitting"
            placeholder="••••••••"
            class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
          >
        </div>

        <div>
          <label
            for="confirmPassword"
            class="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            :disabled="isSubmitting"
            placeholder="••••••••"
            class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
          >
        </div>

        <button
          type="submit"
          :disabled="isSubmitting || !username || !password || !confirmPassword"
          class="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg
            v-if="isSubmitting"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
          <span>{{ isSubmitting ? 'Creating account...' : 'Create Account & Sign In' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = String(route.params.token || '');
const isCheckingToken = ref(true);
const isTokenValid = ref(false);
const tokenError = ref<string | null>(null);

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);

onMounted(async () => {
  if (!token) {
    isCheckingToken.value = false;
    isTokenValid.value = false;
    tokenError.value = 'No invite token provided.';
    return;
  }

  try {
    const res = await api.get<{ valid: boolean; expiresAt: string }>(`/invites/${token}`);
    if (res.valid) {
      isTokenValid.value = true;
    } else {
      isTokenValid.value = false;
      tokenError.value = 'Invite link is no longer valid.';
    }
  } catch (err) {
    isTokenValid.value = false;
    if (err instanceof ApiError) {
      tokenError.value = err.message;
    } else {
      tokenError.value = 'Failed to verify invite link. Please check your network.';
    }
  } finally {
    isCheckingToken.value = false;
  }
});

async function handleAcceptInvite() {
  submitError.value = null;

  if (password.value !== confirmPassword.value) {
    submitError.value = 'Passwords do not match.';
    return;
  }

  if (password.value.length < 6) {
    submitError.value = 'Password must be at least 6 characters.';
    return;
  }

  isSubmitting.value = true;

  try {
    await authStore.acceptInvite(token, username.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    if (err instanceof ApiError) {
      submitError.value = err.message;
    } else {
      submitError.value = 'Failed to accept invite. Please try again.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>
