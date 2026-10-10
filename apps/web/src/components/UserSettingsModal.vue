<template>
  <div
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div>
          <h3 class="text-lg font-semibold text-white">
            Configurações da Conta
          </h3>
          <p class="text-xs text-zinc-400 mt-0.5">
            Gerencie integrações e preferências de inteligência artificial.
          </p>
        </div>
        <button
          type="button"
          class="text-zinc-500 hover:text-zinc-300 p-1 transition cursor-pointer"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- User Profile Summary -->
      <div class="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs">
        <div>
          <span class="text-zinc-400">Usuário:</span>
          <span class="text-white font-medium ml-1.5">{{ authStore.user?.username }}</span>
        </div>
        <div>
          <span class="text-zinc-400">Perfil:</span>
          <span class="ml-1.5 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold uppercase tracking-wider text-[10px]">
            {{ authStore.user?.role }}
          </span>
        </div>
      </div>

      <!-- Telegram Integration Section -->
      <div class="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base">✈️</span>
            <h4 class="text-sm font-semibold text-white">
              Telegram Bot
            </h4>
          </div>
          <span
            v-if="isTelegramPaired"
            class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/80 text-emerald-400 font-medium"
          >
            Vinculado
          </span>
          <span
            v-else
            class="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium"
          >
            Não vinculado
          </span>
        </div>

        <p class="text-xs text-zinc-400">
          Receba notificações e peça downloads diretamente pelo chat do Telegram.
        </p>

        <!-- Already Paired State -->
        <div
          v-if="isTelegramPaired"
          class="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs"
        >
          <div>
            <span class="text-zinc-400">ID do Chat:</span>
            <span class="text-zinc-200 font-mono ml-1.5">{{ authStore.user?.telegramChatId }}</span>
          </div>
          <button
            type="button"
            :disabled="isUnlinking"
            class="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 rounded-md transition cursor-pointer"
            @click="handleUnlinkTelegram"
          >
            {{ isUnlinking ? 'Desvinculando...' : 'Desvincular' }}
          </button>
        </div>

        <!-- Not Paired State -->
        <div
          v-else
          class="space-y-3"
        >
          <div
            v-if="pairingCode"
            class="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center space-y-2"
          >
            <div class="text-[11px] text-zinc-400">
              Seu código de vinculação:
            </div>
            <div class="flex items-center justify-center gap-3">
              <span class="font-mono text-2xl font-bold tracking-widest text-indigo-400 bg-zinc-950 px-4 py-1.5 rounded-lg border border-zinc-800">
                {{ pairingCode }}
              </span>
              <button
                type="button"
                class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded-lg transition cursor-pointer"
                @click="copyPairingCode"
              >
                {{ hasCopiedCode ? 'Copiado!' : 'Copiar' }}
              </button>
            </div>
            <div class="text-[11px] text-amber-400 font-mono">
              Expira em: {{ countdownText }}
            </div>
            <p class="text-[11px] text-zinc-400 mt-1">
              Abra o bot no Telegram e envie: <code class="bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-200">/link {{ pairingCode }}</code>
            </p>
          </div>

          <button
            v-if="!pairingCode"
            type="button"
            :disabled="isGeneratingCode"
            class="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            @click="generatePairingCode"
          >
            <span>{{ isGeneratingCode ? 'Gerando...' : 'Gerar Código de Vinculação' }}</span>
          </button>
        </div>
      </div>

      <!-- Personal Gemini API Key Section -->
      <div class="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base">🤖</span>
            <h4 class="text-sm font-semibold text-white">
              Chave Gemini API (Pessoal)
            </h4>
          </div>
          <span
            v-if="authStore.user?.hasPersonalGeminiKey"
            class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/80 text-emerald-400 font-medium"
          >
            Configurada
          </span>
          <span
            v-else
            class="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium"
          >
            Não configurada
          </span>
        </div>

        <p class="text-xs text-zinc-400">
          Chave pessoal para interpretação de mensagens em linguagem natural caso a chave global esteja desativada.
        </p>

        <div class="space-y-2">
          <div class="flex gap-2">
            <input
              v-model="geminiApiKeyInput"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="Cole sua Gemini API Key (AIzaSy...)"
              class="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
            >
            <button
              type="button"
              class="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer"
              @click="showApiKey = !showApiKey"
            >
              {{ showApiKey ? 'Ocultar' : 'Ver' }}
            </button>
          </div>

          <div class="flex items-center justify-between pt-1">
            <button
              v-if="authStore.user?.hasPersonalGeminiKey"
              type="button"
              :disabled="isSavingKey"
              class="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
              @click="clearGeminiApiKey"
            >
              Remover Chave
            </button>
            <span v-else />

            <button
              type="button"
              :disabled="isSavingKey || !geminiApiKeyInput.trim()"
              class="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition cursor-pointer"
              @click="saveGeminiApiKey"
            >
              {{ isSavingKey ? 'Salvando...' : 'Salvar Chave' }}
            </button>
          </div>
        </div>

        <div
          v-if="feedbackMessage"
          class="p-2.5 rounded-lg text-xs"
          :class="isFeedbackError ? 'bg-red-950/60 border border-red-800/80 text-red-300' : 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'"
        >
          {{ feedbackMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';

defineEmits<{
  (e: 'close'): void;
}>();

const authStore = useAuthStore();

const isTelegramPaired = computed(() => Boolean(authStore.user?.telegramChatId));

const pairingCode = ref<string | null>(null);
const expiresIn = ref(0);
const countdownTimer = ref<number | null>(null);
const isGeneratingCode = ref(false);
const isUnlinking = ref(false);
const hasCopiedCode = ref(false);

const geminiApiKeyInput = ref('');
const showApiKey = ref(false);
const isSavingKey = ref(false);
const feedbackMessage = ref<string | null>(null);
const isFeedbackError = ref(false);

const countdownText = computed(() => {
  const mins = Math.floor(expiresIn.value / 60);
  const secs = expiresIn.value % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
});

async function generatePairingCode() {
  isGeneratingCode.value = true;
  feedbackMessage.value = null;
  try {
    const res = await api.post<{ code: string; expiresInSeconds: number }>('/auth/telegram-pairing/code');
    pairingCode.value = res.code;
    expiresIn.value = res.expiresInSeconds;

    if (countdownTimer.value) clearInterval(countdownTimer.value);
    countdownTimer.value = window.setInterval(() => {
      if (expiresIn.value > 0) {
        expiresIn.value -= 1;
      } else {
        pairingCode.value = null;
        if (countdownTimer.value) clearInterval(countdownTimer.value);
      }
    }, 1000);
  } catch (err) {
    showFeedback('Erro ao gerar código de vinculação', true);
  } finally {
    isGeneratingCode.value = false;
  }
}

async function handleUnlinkTelegram() {
  isUnlinking.value = true;
  feedbackMessage.value = null;
  try {
    await api.delete('/auth/telegram-pairing');
    if (authStore.user) {
      authStore.user.telegramChatId = null;
    }
    showFeedback('Telegram desvinculado com sucesso!', false);
  } catch (err) {
    showFeedback('Falha ao desvincular Telegram', true);
  } finally {
    isUnlinking.value = false;
  }
}

async function copyPairingCode() {
  if (!pairingCode.value) return;
  try {
    await navigator.clipboard.writeText(pairingCode.value);
    hasCopiedCode.value = true;
    setTimeout(() => {
      hasCopiedCode.value = false;
    }, 2000);
  } catch {
    // Non-blocking
  }
}

async function saveGeminiApiKey() {
  if (!geminiApiKeyInput.value.trim()) return;
  isSavingKey.value = true;
  feedbackMessage.value = null;
  try {
    await api.put('/users/me/gemini-api-key', { apiKey: geminiApiKeyInput.value.trim() });
    if (authStore.user) {
      authStore.user.hasPersonalGeminiKey = true;
    }
    geminiApiKeyInput.value = '';
    showFeedback('Chave Gemini salva com sucesso!', false);
  } catch (err) {
    showFeedback('Erro ao salvar chave Gemini', true);
  } finally {
    isSavingKey.value = false;
  }
}

async function clearGeminiApiKey() {
  isSavingKey.value = true;
  feedbackMessage.value = null;
  try {
    await api.put('/users/me/gemini-api-key', { apiKey: null });
    if (authStore.user) {
      authStore.user.hasPersonalGeminiKey = false;
    }
    geminiApiKeyInput.value = '';
    showFeedback('Chave Gemini removida com sucesso.', false);
  } catch (err) {
    showFeedback('Erro ao remover chave Gemini', true);
  } finally {
    isSavingKey.value = false;
  }
}

function showFeedback(msg: string, isError: boolean) {
  feedbackMessage.value = msg;
  isFeedbackError.value = isError;
}

onUnmounted(() => {
  if (countdownTimer.value) clearInterval(countdownTimer.value);
});
</script>
