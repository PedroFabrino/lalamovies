<template>
  <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
    <div class="mb-6">
      <h2 class="text-lg font-semibold text-white">
        Subtitle Transcription Window
      </h2>
      <p class="text-xs text-zinc-400 mt-0.5">
        Configure the off-peak daily schedule window for GPU-accelerated Whisper subtitle generation.
      </p>
    </div>

    <!-- Alerts -->
    <div
      v-if="transcriptionSuccessMessage"
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
      <span>{{ transcriptionSuccessMessage }}</span>
    </div>

    <div
      v-if="transcriptionErrorMessage"
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
      <span>{{ transcriptionErrorMessage }}</span>
    </div>

    <form
      class="space-y-6"
      @submit.prevent="$emit('saveTranscriptionConfig')"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label
            for="transcription_window_start"
            class="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Window Start Time
          </label>
          <input
            id="transcription_window_start"
            v-model="transcriptionForm.transcription_window_start"
            type="time"
            required
            class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
          <p class="text-[11px] text-zinc-500 mt-1">
            Start of off-peak window (HH:MM)
          </p>
        </div>

        <div>
          <label
            for="transcription_window_end"
            class="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Window End Time
          </label>
          <input
            id="transcription_window_end"
            v-model="transcriptionForm.transcription_window_end"
            type="time"
            required
            class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
          <p class="text-[11px] text-zinc-500 mt-1">
            End of off-peak window (HH:MM)
          </p>
        </div>

        <div>
          <label
            for="transcription_timezone"
            class="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Schedule Timezone
          </label>
          <div class="flex gap-2">
            <input
              id="transcription_timezone"
              v-model="transcriptionForm.transcription_timezone"
              type="text"
              required
              placeholder="e.g. America/Sao_Paulo"
              class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <button
              type="button"
              title="Set to browser timezone"
              class="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 text-xs whitespace-nowrap cursor-pointer transition"
              @click="transcriptionForm.transcription_timezone = browserTimezone"
            >
              Use Local
            </button>
          </div>
          <p class="text-[11px] text-zinc-500 mt-1">
            Detected browser timezone: <span class="text-zinc-400 font-mono">{{ browserTimezone }}</span>
          </p>
        </div>
      </div>

      <div class="pt-4 border-t border-zinc-800 flex justify-end">
        <button
          type="submit"
          :disabled="isSavingTranscription"
          class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <svg
            v-if="isSavingTranscription"
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
          <span>{{ isSavingTranscription ? 'Saving...' : 'Save Transcription Settings' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
export interface TranscriptionFormData {
  transcription_window_start: string;
  transcription_window_end: string;
  transcription_timezone: string;
}

defineProps<{
  transcriptionForm: TranscriptionFormData;
  isSavingTranscription: boolean;
  transcriptionSuccessMessage: string | null;
  transcriptionErrorMessage: string | null;
  browserTimezone: string;
}>();

defineEmits<{
  (e: 'saveTranscriptionConfig'): void;
}>();
</script>
