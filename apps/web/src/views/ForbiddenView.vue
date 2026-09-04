<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
      <div class="w-16 h-16 rounded-full bg-red-950/60 border border-red-800/80 text-red-400 flex items-center justify-center mx-auto mb-5">
        <svg
          class="w-8 h-8"
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

      <h1 class="text-4xl font-extrabold text-white mb-2">
        403
      </h1>
      <h2 class="text-lg font-semibold text-zinc-200 mb-2">
        Access Forbidden
      </h2>
      <p class="text-sm text-zinc-400 mb-6">
        You do not have administrator permissions to access this page. Please contact a server administrator if you believe this is a mistake.
      </p>

      <router-link
        to="/dashboard"
        class="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition"
      >
        Back to Dashboard
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
