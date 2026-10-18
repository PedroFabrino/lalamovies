<template>
  <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-white">
            Preferred Indexer ({{ cookieStatus?.indexerName || 'BJ-Share' }})
          </h2>
          <span
            v-if="isLoadingStatus"
            class="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 animate-pulse"
          >
            Checking...
          </span>
          <span
            v-else-if="cookieStatus?.status === 'ok'"
            class="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1.5"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Connected &amp; Valid
          </span>
          <span
            v-else-if="cookieStatus?.status === 'expired'"
            class="px-2 py-0.5 rounded text-xs font-medium bg-red-950/80 text-red-300 border border-red-800 flex items-center gap-1.5"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-red-400" />
            Cookie Expired / Failing
          </span>
          <span
            v-else-if="cookieStatus?.status === 'missing'"
            class="px-2 py-0.5 rounded text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1.5"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Cookie Missing
          </span>
          <span
            v-else
            class="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1.5"
          >
            {{ cookieStatus?.status === 'not_configured' ? 'Not Configured' : 'Unreachable' }}
          </span>
        </div>
        <p class="text-xs text-zinc-400 mt-1">
          Maintain the active tracker session in Prowlarr without navigating away from the administration console.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          :disabled="isLoadingStatus"
          class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          title="Refresh Cookie Status"
          @click="fetchCookieStatus(true)"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': isLoadingStatus }"
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
          <span>Check Status</span>
        </button>
      </div>
    </div>

    <!-- Active Details Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-xs">
      <div class="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
        <span class="text-zinc-500 block mb-0.5">Matched Indexer</span>
        <span class="font-medium text-white">{{ cookieStatus?.indexerName || 'None' }}</span>
      </div>
      <div class="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
        <span class="text-zinc-500 block mb-0.5">Active Session Cookie</span>
        <span class="font-mono text-zinc-300 truncate block">{{ cookieStatus?.cookiePreview || '—' }}</span>
      </div>
      <div class="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
        <span class="text-zinc-500 block mb-0.5">Health State</span>
        <span
          class="font-medium"
          :class="cookieStatus?.status === 'ok' ? 'text-emerald-400' : 'text-amber-400'"
        >
          {{ cookieStatus?.message || '—' }}
        </span>
      </div>
    </div>

    <!-- Action feedback banner -->
    <div
      v-if="feedbackMessage"
      class="mb-6 p-4 rounded-lg text-xs flex items-center gap-3"
      :class="feedbackMessage.type === 'success'
        ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-200'
        : 'bg-red-950/50 border border-red-800 text-red-200'"
    >
      <svg
        v-if="feedbackMessage.type === 'success'"
        class="w-4 h-4 text-emerald-400 shrink-0"
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
      <svg
        v-else
        class="w-4 h-4 text-red-400 shrink-0"
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
      <span>{{ feedbackMessage.text }}</span>
    </div>

    <!-- Cookie Update Form -->
    <div class="space-y-4">
      <div>
        <label
          for="preferred_indexer_cookie"
          class="block text-xs font-medium text-zinc-300 mb-1.5"
        >
          Update Cookie String
        </label>
        <textarea
          id="preferred_indexer_cookie"
          v-model="cookieInput"
          rows="3"
          placeholder="Paste new cookie string here (e.g. __cfbbid=31...; session=74tm...)"
          class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600"
        />
        <div class="flex items-center justify-between mt-1 text-[11px] text-zinc-500">
          <span>Include both <code class="text-zinc-400">__cfbbid</code> and <code class="text-zinc-400">session</code> values copied from your browser DevTools.</span>
          <button
            type="button"
            class="text-indigo-400 hover:text-indigo-300 cursor-pointer underline ml-2 shrink-0"
            @click="showInstructions = !showInstructions"
          >
            {{ showInstructions ? 'Hide instructions' : 'How to get cookie' }}
          </button>
        </div>
      </div>

      <div
        v-if="showInstructions"
        class="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-lg text-xs text-zinc-300 space-y-1.5"
      >
        <p class="font-semibold text-zinc-100 mb-1">
          How to copy the cookie from your browser:
        </p>
        <ol class="list-decimal list-inside space-y-1 text-zinc-400">
          <li>Log in to BJ-Share in your browser (tick "Remember me", untick "Log Me Out if IP Changes").</li>
          <li>Press <kbd class="px-1 py-0.5 bg-zinc-900 rounded border border-zinc-700 text-zinc-200">F12</kbd> to open Developer Tools and select the <strong>Network</strong> tab.</li>
          <li>Refresh the torrent list page (<kbd class="px-1 py-0.5 bg-zinc-900 rounded border border-zinc-700 text-zinc-200">F5</kbd>) and click the first document request.</li>
          <li>In <strong>Headers</strong> $\rightarrow$ <strong>Request Headers</strong>, find <code class="text-zinc-300">cookie:</code>.</li>
          <li>Copy the entire string after <code class="text-zinc-300">cookie: </code> and paste it above.</li>
        </ol>
      </div>

      <div class="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
        <button
          type="button"
          :disabled="isTesting || isSaving"
          class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          @click="testCookie(cookieInput.trim() || undefined)"
        >
          <svg
            v-if="isTesting"
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
          <span>{{ isTesting ? 'Testing...' : (cookieInput.trim() ? 'Test Input Cookie' : 'Test Active Cookie') }}</span>
        </button>

        <button
          type="button"
          :disabled="isSaving || isTesting || !cookieInput.trim()"
          class="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          @click="saveCookie(cookieInput)"
        >
          <svg
            v-if="isSaving"
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
          <span>{{ isSaving ? 'Saving & Verifying...' : 'Save & Verify Cookie' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePreferredIndexerCookie } from '../../composables/usePreferredIndexerCookie';

const showInstructions = ref(false);

const {
  cookieStatus,
  isLoadingStatus,
  isTesting,
  isSaving,
  cookieInput,
  feedbackMessage,
  fetchCookieStatus,
  testCookie,
  saveCookie,
} = usePreferredIndexerCookie();

onMounted(() => {
  fetchCookieStatus();
});
</script>
