<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
    <Navbar />

    <main class="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
      <!-- Page Title -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-white">
          New Download Request
        </h1>
        <p class="text-sm text-zinc-400 mt-1">
          Add media by magnet link. We automatically match metadata and rename files for Jellyfin.
        </p>
      </div>

      <!-- Step Indicator -->
      <div class="flex items-center justify-between mb-8 max-w-lg mx-auto">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition"
            :class="currentStep === 1
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
              : currentStep > 1
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400'"
          >
            <svg
              v-if="currentStep > 1"
              class="w-4 h-4"
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
            <span v-else>1</span>
          </div>
          <span
            class="text-xs font-medium"
            :class="currentStep >= 1 ? 'text-zinc-200' : 'text-zinc-500'"
          >
            Source
          </span>
        </div>

        <div
          class="h-0.5 flex-1 mx-3 bg-zinc-800"
          :class="{ '!bg-emerald-600': currentStep > 1 }"
        />

        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition"
            :class="currentStep === 2
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
              : currentStep > 2
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400'"
          >
            <svg
              v-if="currentStep > 2"
              class="w-4 h-4"
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
            <span v-else>2</span>
          </div>
          <span
            class="text-xs font-medium"
            :class="currentStep >= 2 ? 'text-zinc-200' : 'text-zinc-500'"
          >
            Match
          </span>
        </div>

        <div
          class="h-0.5 flex-1 mx-3 bg-zinc-800"
          :class="{ '!bg-emerald-600': currentStep > 2 }"
        />

        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition"
            :class="currentStep === 3
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
              : 'bg-zinc-800 text-zinc-400'"
          >
            <span>3</span>
          </div>
          <span
            class="text-xs font-medium"
            :class="currentStep === 3 ? 'text-zinc-200' : 'text-zinc-500'"
          >
            Confirm
          </span>
        </div>
      </div>

      <!-- ================= STEP 1: Magnet & Type ================= -->
      <div
        v-if="currentStep === 1"
        class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl"
      >
        <!-- Error Alert -->
        <div
          v-if="step1Error"
          class="mb-6 p-4 bg-red-950/50 border border-red-800/80 rounded-lg text-sm text-red-200 flex items-start gap-3"
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
          <span>{{ step1Error }}</span>
        </div>

        <form
          class="space-y-6"
          @submit.prevent="handleSearchMetadata"
        >
          <!-- Magnet link input -->
          <div>
            <label
              for="magnetLink"
              class="block text-sm font-medium text-zinc-300 mb-2"
            >
              Magnet Link
            </label>
            <textarea
              id="magnetLink"
              v-model="magnetLink"
              rows="4"
              required
              :disabled="isSearching"
              placeholder="magnet:?xt=urn:btih:..."
              class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            />
            <p class="text-xs text-zinc-500 mt-1.5">
              Paste the full magnet URI from your torrent indexer.
            </p>
          </div>

          <!-- Media Type radio selection -->
          <div>
            <label class="block text-sm font-medium text-zinc-300 mb-2">
              Media Type
            </label>
            <div class="grid grid-cols-3 gap-3">
              <label
                v-for="type in mediaTypeOptions"
                :key="type.value"
                class="flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition text-center"
                :class="mediaType === type.value
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'"
              >
                <input
                  v-model="mediaType"
                  type="radio"
                  name="mediaType"
                  :value="type.value"
                  class="sr-only"
                >
                <span class="text-lg mb-1">{{ type.icon }}</span>
                <span class="text-xs sm:text-sm font-medium">{{ type.label }}</span>
              </label>
            </div>
          </div>

          <!-- Custom query override (optional) -->
          <div>
            <label
              for="customQuery"
              class="block text-sm font-medium text-zinc-300 mb-2"
            >
              Title Search Query <span class="text-xs text-zinc-500 font-normal">(Optional override)</span>
            </label>
            <input
              id="customQuery"
              v-model="customQuery"
              type="text"
              :disabled="isSearching"
              placeholder="e.g. Inception, Breaking Bad, Jujutsu Kaisen"
              class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            >
            <p class="text-xs text-zinc-500 mt-1.5">
              If left blank, the title is automatically extracted from the magnet name.
            </p>
          </div>

          <button
            type="submit"
            :disabled="isSearching || !magnetLink.trim()"
            class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg
              v-if="isSearching"
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
            <span>{{ isSearching ? 'Searching Metadata...' : 'Find Matches & Continue' }}</span>
          </button>
        </form>
      </div>

      <!-- ================= STEP 2: Match Cards ================= -->
      <div
        v-else-if="currentStep === 2"
        class="space-y-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-white">
              Select Metadata Match
            </h2>
            <p class="text-xs text-zinc-400 mt-0.5">
              Choose the correct match for your media to ensure proper naming in Jellyfin.
            </p>
          </div>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            @click="currentStep = 1"
          >
            Back to Step 1
          </button>
        </div>

        <div
          v-if="candidates.length === 0"
          class="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center"
        >
          <p class="text-zinc-400 text-sm mb-4">
            No metadata matches found for this query.
          </p>
          <button
            type="button"
            class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition cursor-pointer"
            @click="currentStep = 1"
          >
            Edit Search Query
          </button>
        </div>

        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div
            v-for="candidate in candidates"
            :key="candidate.id"
            class="bg-zinc-900/70 border rounded-xl p-4 flex gap-4 transition cursor-pointer group"
            :class="selectedCandidate?.id === candidate.id
              ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20'
              : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'"
            @click="selectCandidate(candidate)"
          >
            <!-- Poster image -->
            <div class="w-20 h-28 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-700/50 flex items-center justify-center">
              <img
                v-if="candidate.posterUrl"
                :src="candidate.posterUrl"
                :alt="candidate.title"
                class="w-full h-full object-cover"
                loading="lazy"
              >
              <div
                v-else
                class="text-zinc-600 text-xs text-center p-2"
              >
                No Poster
              </div>
            </div>

            <!-- Match info -->
            <div class="flex-1 flex flex-col justify-between overflow-hidden">
              <div>
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-semibold text-white text-sm group-hover:text-indigo-300 transition line-clamp-1">
                    {{ candidate.title }}
                  </h3>
                  <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {{ candidate.source }}
                  </span>
                </div>
                <div class="text-xs text-zinc-400 mt-0.5">
                  <span v-if="candidate.year">{{ candidate.year }}</span>
                  <span v-else>Year unknown</span>
                </div>
                <p class="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                  {{ candidate.overview || 'No overview available.' }}
                </p>
              </div>

              <div class="mt-3 flex items-center justify-end">
                <span
                  class="text-xs font-medium transition flex items-center gap-1"
                  :class="selectedCandidate?.id === candidate.id ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'"
                >
                  <svg
                    v-if="selectedCandidate?.id === candidate.id"
                    class="w-4 h-4 text-indigo-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span>{{ selectedCandidate?.id === candidate.id ? 'Selected' : 'Select' }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            @click="currentStep = 1"
          >
            Back
          </button>
          <button
            type="button"
            :disabled="!selectedCandidate"
            class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            @click="currentStep = 3"
          >
            Continue to Confirmation
          </button>
        </div>
      </div>

      <!-- ================= STEP 3: Confirm & Submit ================= -->
      <div
        v-else-if="currentStep === 3 && selectedCandidate"
        class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl space-y-6"
      >
        <div>
          <h2 class="text-lg font-semibold text-white">
            Confirm Download Request
          </h2>
          <p class="text-xs text-zinc-400 mt-0.5">
            Review the media details below before starting the download.
          </p>
        </div>

        <!-- Error Alert (Disk Space 422 or General) -->
        <div
          v-if="step3Error"
          class="p-4 bg-red-950/60 border border-red-800 rounded-lg text-sm text-red-200 flex items-start gap-3"
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <div class="font-semibold text-red-300">
              Cannot Submit Request
            </div>
            <div class="mt-0.5">
              {{ step3Error }}
            </div>
          </div>
        </div>

        <!-- Selected match preview card -->
        <div class="bg-zinc-950/70 border border-zinc-800 rounded-xl p-5 flex gap-5">
          <div class="w-24 h-36 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-700/50 flex items-center justify-center">
            <img
              v-if="selectedCandidate.posterUrl"
              :src="selectedCandidate.posterUrl"
              :alt="selectedCandidate.title"
              class="w-full h-full object-cover"
            >
            <div
              v-else
              class="text-zinc-600 text-xs text-center p-2"
            >
              No Poster
            </div>
          </div>

          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {{ formatMediaType(mediaType) }}
              </span>
              <span class="text-xs text-zinc-400 uppercase font-mono">
                {{ selectedCandidate.source }} #{{ selectedCandidate.id }}
              </span>
            </div>

            <h3 class="text-xl font-bold text-white mb-1">
              {{ selectedCandidate.title }}
            </h3>

            <div class="text-xs text-zinc-400 mb-3">
              <span v-if="selectedCandidate.year">{{ selectedCandidate.year }}</span>
            </div>

            <p class="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
              {{ selectedCandidate.overview || 'No overview available.' }}
            </p>
          </div>
        </div>

        <!-- TV Show / Anime Season input -->
        <div
          v-if="mediaType === 'tv_show' || mediaType === 'anime'"
          class="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4"
        >
          <label
            for="seasonNumber"
            class="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            Season Number <span class="text-xs text-zinc-500 font-normal">(Optional)</span>
          </label>
          <input
            id="seasonNumber"
            v-model.number="seasonNumber"
            type="number"
            min="1"
            placeholder="e.g. 1"
            :disabled="isSubmitting"
            class="w-32 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
          >
          <p class="text-xs text-zinc-500 mt-1">
            Specify season for TV show folder structure (e.g. Season 01). Leave empty if torrent contains multiple seasons.
          </p>
        </div>

        <!-- Magnet link summary -->
        <div class="text-xs text-zinc-500 break-all bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
          <span class="text-zinc-400 font-semibold">Magnet:</span> {{ magnetLink.slice(0, 80) }}...
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            type="button"
            :disabled="isSubmitting"
            class="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer disabled:opacity-50"
            @click="currentStep = 2"
          >
            Back
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleConfirmRequest"
          >
            <svg
              v-if="isSubmitting"
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
            <span>{{ isSubmitting ? 'Submitting...' : 'Confirm & Download' }}</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import { api, ApiError } from '../lib/api';
import { useRequestsStore, MediaType, DownloadRequest } from '../stores/requests';
import { formatMediaType } from '../lib/formatters';

interface MetadataCandidate {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
}

const router = useRouter();
const requestsStore = useRequestsStore();

const currentStep = ref<1 | 2 | 3>(1);

// Step 1 State
const magnetLink = ref('');
const mediaType = ref<MediaType>('movie');
const customQuery = ref('');
const isSearching = ref(false);
const step1Error = ref<string | null>(null);

const mediaTypeOptions: { value: MediaType; label: string; icon: string }[] = [
  { value: 'movie', label: 'Movie', icon: '🎬' },
  { value: 'tv_show', label: 'TV Show', icon: '📺' },
  { value: 'anime', label: 'Anime', icon: '⛩️' },
];

// Step 2 State
const candidates = ref<MetadataCandidate[]>([]);
const selectedCandidate = ref<MetadataCandidate | null>(null);

// Step 3 State
const seasonNumber = ref<number | null>(null);
const isSubmitting = ref(false);
const step3Error = ref<string | null>(null);

async function handleSearchMetadata() {
  if (!magnetLink.value.trim()) return;

  isSearching.value = true;
  step1Error.value = null;

  try {
    const data = await api.post<{ candidates: MetadataCandidate[] }>('/requests/search-metadata', {
      magnetLink: magnetLink.value.trim(),
      mediaType: mediaType.value,
      query: customQuery.value.trim() || undefined,
    });

    candidates.value = data.candidates || [];
    selectedCandidate.value = candidates.value.length > 0 ? candidates.value[0] : null;
    currentStep.value = 2;
  } catch (err) {
    if (err instanceof ApiError) {
      step1Error.value = err.message;
    } else {
      step1Error.value = 'Failed to search metadata. Please check the magnet link.';
    }
  } finally {
    isSearching.value = false;
  }
}

function selectCandidate(candidate: MetadataCandidate) {
  selectedCandidate.value = candidate;
  currentStep.value = 3;
}

async function handleConfirmRequest() {
  if (!selectedCandidate.value) return;

  isSubmitting.value = true;
  step3Error.value = null;

  try {
    const res = await api.post<{ request: DownloadRequest }>('/requests', {
      magnetLink: magnetLink.value.trim(),
      mediaType: mediaType.value,
      metadataId: selectedCandidate.value.id,
      metadataSource: selectedCandidate.value.source,
      title: selectedCandidate.value.title,
      year: selectedCandidate.value.year ?? undefined,
      seasonNumber: seasonNumber.value ?? undefined,
    });

    if (res.request.status === 'queued') {
      requestsStore.showToast(
        'Your request has been queued and will start when a download slot is available',
        'info'
      );
    } else {
      requestsStore.showToast(
        `Download started: ${res.request.title}`,
        'success'
      );
    }

    router.push('/dashboard');
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.statusCode === 422) {
        step3Error.value =
          'Not enough disk space — please ask an admin to free up space.';
      } else {
        step3Error.value = err.message;
      }
    } else {
      step3Error.value = 'Failed to submit download request.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>
