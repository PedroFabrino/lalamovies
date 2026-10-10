<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl text-center">
      <!-- Loading State -->
      <div
        v-if="status === 'loading'"
        class="py-6 space-y-4"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
          <svg
            class="animate-spin w-8 h-8 text-indigo-400"
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
        </div>
        <h2 class="text-xl font-bold text-white">
          Vinculando ao Telegram...
        </h2>
        <p class="text-sm text-zinc-400">
          Aguarde enquanto confirmamos sua sessão de autenticação.
        </p>
      </div>

      <!-- Success State -->
      <div
        v-else-if="status === 'success'"
        class="py-6 space-y-6"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div class="space-y-2">
          <h2 class="text-2xl font-bold text-white">
            Conta Vinculada!
          </h2>
          <p class="text-sm text-zinc-400">
            Sua conta <span class="font-semibold text-emerald-300">{{ claimedUser?.username }}</span> foi vinculada com sucesso ao Telegram.
          </p>
        </div>

        <div class="space-y-3 pt-2">
          <a
            :href="telegramLink"
            class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition"
            data-testid="return-telegram-btn"
          >
            <svg
              class="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24-.01.39z" />
            </svg>
            <span>Voltar para o Telegram</span>
          </a>

          <button
            class="w-full px-4 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
            @click="router.push('/dashboard')"
          >
            Ir para o Dashboard
          </button>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else
        class="py-6 space-y-6"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/60 text-red-400 border border-red-800/60">
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

        <div class="space-y-2">
          <h2 class="text-2xl font-bold text-white">
            Falha na Vinculação
          </h2>
          <p class="text-sm text-red-300">
            {{ errorMessage }}
          </p>
        </div>

        <div class="space-y-3 pt-2">
          <button
            class="w-full px-5 py-3 rounded-lg font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition"
            @click="router.push('/dashboard')"
          >
            Ir para o Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { apiRequest, ApiError } from '../lib/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const status = ref<'loading' | 'success' | 'error'>('loading');
const errorMessage = ref<string>('');
const claimedUser = ref<{ id: string; username: string; role: string } | null>(null);
const botUsername = ref<string>('mdm_download_bot');

const telegramLink = computed(() => {
  return `https://t.me/${botUsername.value}`;
});

async function claimSession() {
  const token = route.query.token as string | undefined;

  if (!token || !token.trim()) {
    status.value = 'error';
    errorMessage.value = 'Token de vinculação ausente ou inválido na URL.';
    return;
  }

  if (!authStore.isAuthenticated) {
    router.push({
      name: 'login',
      query: { redirect: route.fullPath },
    });
    return;
  }

  try {
    status.value = 'loading';
    const res = await apiRequest<{
      ok: boolean;
      user: { id: string; username: string; role: string };
      botUsername?: string;
    }>('/auth/telegram-pairing/claim', {
      method: 'POST',
      body: JSON.stringify({ token: token.trim() }),
    });

    if (res.ok) {
      claimedUser.value = res.user;
      if (res.botUsername) {
        botUsername.value = res.botUsername;
      }
      status.value = 'success';
    } else {
      status.value = 'error';
      errorMessage.value = 'Não foi possível confirmar a vinculação.';
    }
  } catch (err) {
    status.value = 'error';
    if (err instanceof ApiError) {
      errorMessage.value = err.message;
    } else {
      errorMessage.value = 'Erro ao comunicar com o servidor. Tente novamente.';
    }
  }
}

onMounted(() => {
  claimSession();
});
</script>
