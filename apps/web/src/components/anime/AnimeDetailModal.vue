<template>
  <div
    v-if="anime"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
    data-testid="anime-detail-modal"
    @click.self="handleClose"
  >
    <div
      class="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 my-8"
      @click.stop
    >
      <!-- Close button -->
      <button
        type="button"
        class="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition border border-zinc-700/60"
        aria-label="Close modal"
        @click="handleClose"
      >
        ✕
      </button>

      <!-- Banner Header -->
      <div class="relative h-44 sm:h-52 w-full bg-zinc-950 overflow-hidden">
        <img
          v-if="bannerUrl || posterUrl"
          :src="bannerUrl || posterUrl"
          :alt="displayTitle"
          class="w-full h-full object-cover opacity-60 filter blur-sm scale-105"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

        <!-- Header Content Overlay -->
        <div class="absolute bottom-4 left-5 right-5 flex items-end gap-4">
          <img
            v-if="posterUrl"
            :src="posterUrl"
            :alt="displayTitle"
            class="w-20 sm:w-24 aspect-[3/4] object-cover rounded-lg shadow-2xl border border-zinc-700/60 flex-shrink-0"
          />
          <div class="flex-1 min-w-0 pb-1">
            <h2 class="text-xl sm:text-2xl font-bold text-white truncate" :title="displayTitle">
              {{ displayTitle }}
            </h2>
            <p v-if="subTitle && subTitle !== displayTitle" class="text-xs text-zinc-400 truncate mt-0.5">
              {{ subTitle }}
            </p>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span
                class="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                :class="statusBadgeClasses"
              >
                {{ statusLabel }}
              </span>
              <span v-if="anime.format" class="text-xs text-zinc-400">{{ anime.format }}</span>
              <span v-if="anime.episodes" class="text-xs text-zinc-400">• {{ anime.episodes }} episodes</span>
              <span v-if="anime.averageScore" class="text-xs font-semibold text-amber-400">
                • ★ {{ anime.averageScore }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="p-5 sm:p-6 space-y-6">
        <!-- Normal Details View -->
        <template v-if="!showWaitlistConfirmation">
          <!-- Genres & Trailer -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="genre in anime.genres"
                :key="genre"
                class="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50"
              >
                {{ genre }}
              </span>
            </div>

            <a
              v-if="trailerUrl"
              :href="trailerUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition"
            >
              <span>▶</span> Watch Trailer
            </a>
          </div>

          <!-- Synopsis -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Synopsis
            </h4>
            <div
              class="text-sm text-zinc-300 leading-relaxed max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700"
              v-html="cleanDescription"
            />
          </div>

          <!-- Action Buttons Row -->
          <div class="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-end gap-3">
            <template v-if="isAiringOrFinished">
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                @click="startWaitlistFlow"
              >
                Watch on Waitlist
              </button>
              <button
                v-if="isStreamingEnabled"
                type="button"
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow transition"
                @click="$emit('stream', anime)"
              >
                <span>🎬</span> Instant Stream
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow transition"
                @click="$emit('download', anime)"
              >
                <span>⬇️</span> Download Torrent
              </button>
            </template>

            <template v-else>
              <button
                type="button"
                class="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg transition"
                @click="startWaitlistFlow"
              >
                <span>+</span> Add to Waitlist
              </button>
            </template>
          </div>
        </template>

        <!-- TMDB Confirmation Step -->
        <template v-else>
          <div class="space-y-4" data-testid="tmdb-confirmation-flow">
            <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span>🔗</span> Confirm TMDB Waitlist Match
              </h3>
              <button
                type="button"
                class="text-xs text-zinc-400 hover:text-white"
                @click="showWaitlistConfirmation = false"
              >
                ← Back
              </button>
            </div>

            <div v-if="isResolvingTmdb" class="py-8 text-center text-zinc-400 text-sm">
              <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Matching with TMDB catalog...
            </div>

            <div v-else-if="tmdbCandidates.length === 0" class="py-6 text-center text-zinc-400 text-sm">
              <p>No exact TMDB match was found automatically.</p>
              <button
                type="button"
                class="mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                @click="submitDirectWaitlist"
              >
                Submit with AniList Title
              </button>
            </div>

            <div v-else class="space-y-4">
              <!-- Matched Candidate Preview -->
              <div class="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-start gap-3.5">
                <img
                  v-if="selectedTmdbCandidate?.posterUrl"
                  :src="selectedTmdbCandidate.posterUrl"
                  :alt="selectedTmdbCandidate.title"
                  class="w-14 aspect-[2/3] object-cover rounded shadow flex-shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-white truncate">{{ selectedTmdbCandidate?.title }}</span>
                    <span v-if="selectedTmdbCandidate?.year" class="text-xs text-zinc-400">({{ selectedTmdbCandidate.year }})</span>
                  </div>
                  <p class="text-xs text-zinc-400 line-clamp-2 mt-1">
                    {{ selectedTmdbCandidate?.overview || 'No overview available.' }}
                  </p>
                  <p class="text-[11px] text-zinc-500 mt-1">
                    TMDB ID: <span class="font-mono text-zinc-300">{{ selectedTmdbCandidate?.id }}</span>
                  </p>
                </div>
              </div>

              <!-- Candidate Switcher if Multiple -->
              <div v-if="tmdbCandidates.length > 1" class="text-xs">
                <label class="block text-zinc-400 mb-1">Alternate TMDB Candidate:</label>
                <select
                  v-model="selectedCandidateId"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200"
                >
                  <option
                    v-for="cand in tmdbCandidates"
                    :key="cand.id"
                    :value="cand.id"
                  >
                    {{ cand.title }} ({{ cand.year || 'N/A' }}) — ID {{ cand.id }}
                  </option>
                </select>
              </div>

              <!-- Waitlist Mode Selection -->
              <div class="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/80 space-y-2">
                <label class="block text-xs font-semibold text-zinc-300">Waitlist Download Mode:</label>
                <label class="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
                  <input
                    v-model="waitlistMode"
                    type="radio"
                    value="episodic"
                    class="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>Weekly Episodic Tracking</strong>
                    <span class="block text-[11px] text-zinc-400">Auto-advances and downloads each weekly episode as it airs</span>
                  </span>
                </label>
                <label class="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
                  <input
                    v-model="waitlistMode"
                    type="radio"
                    value="season_pack"
                    class="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>Complete Season Pack</strong>
                    <span class="block text-[11px] text-zinc-400">Waits for the season to finish and grabs the full batch release</span>
                  </span>
                </label>
              </div>

              <!-- Confirmation Action Buttons -->
              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  :disabled="isSubmittingWaitlist"
                  @click="showWaitlistConfirmation = false"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow"
                  :disabled="isSubmittingWaitlist"
                  @click="confirmWaitlistSubmission"
                >
                  <span v-if="isSubmittingWaitlist" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{{ isSubmittingWaitlist ? 'Adding...' : 'Confirm & Add to Waitlist' }}</span>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { SeasonalAnimeItem } from '../../composables/useSeasonalAnime';
import { api } from '../../lib/api';
import { useRequestsStore } from '../../stores/requests';

interface MetadataCandidate {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
}

const props = withDefaults(
  defineProps<{
    anime: SeasonalAnimeItem | null;
    isStreamingEnabled?: boolean;
  }>(),
  {
    isStreamingEnabled: true,
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'download', anime: SeasonalAnimeItem): void;
  (e: 'stream', anime: SeasonalAnimeItem): void;
}>();

const requestsStore = useRequestsStore();

const showWaitlistConfirmation = ref(false);
const isResolvingTmdb = ref(false);
const isSubmittingWaitlist = ref(false);
const tmdbCandidates = ref<MetadataCandidate[]>([]);
const selectedCandidateId = ref<string>('');
const waitlistMode = ref<'episodic' | 'season_pack'>('episodic');

const posterUrl = computed(() => {
  if (!props.anime) return null;
  return (
    props.anime.coverImage?.extraLarge ||
    props.anime.coverImage?.large ||
    props.anime.coverImage?.medium ||
    null
  );
});

const bannerUrl = computed(() => props.anime?.bannerImage || null);
const displayTitle = computed(() => props.anime?.title?.english || props.anime?.title?.romaji || 'Untitled');
const subTitle = computed(() => props.anime?.title?.romaji || props.anime?.title?.native || '');
const isAiringOrFinished = computed(() => props.anime?.status === 'RELEASING' || props.anime?.status === 'FINISHED');

const cleanDescription = computed(() => {
  if (!props.anime?.description) return 'No synopsis available.';
  return props.anime.description.replace(/<br\s*\/?>/gi, '<br />');
});

const trailerUrl = computed(() => {
  if (!props.anime?.trailer?.id || props.anime.trailer.site?.toLowerCase() !== 'youtube') return null;
  return `https://www.youtube.com/watch?v=${props.anime.trailer.id}`;
});

const statusLabel = computed(() => {
  switch (props.anime?.status) {
    case 'RELEASING': return 'Airing';
    case 'FINISHED': return 'Completed';
    case 'NOT_YET_RELEASED': return 'Upcoming';
    default: return props.anime?.status || 'Anime';
  }
});

const statusBadgeClasses = computed(() => {
  switch (props.anime?.status) {
    case 'RELEASING': return 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400';
    case 'NOT_YET_RELEASED': return 'bg-indigo-950/70 border-indigo-700/60 text-indigo-300';
    case 'FINISHED': return 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300';
    default: return 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400';
  }
});

const selectedTmdbCandidate = computed(() => {
  return tmdbCandidates.value.find((c) => c.id === selectedCandidateId.value) || tmdbCandidates.value[0] || null;
});

watch(
  () => props.anime,
  (newVal) => {
    showWaitlistConfirmation.value = false;
    tmdbCandidates.value = [];
    selectedCandidateId.value = '';
    waitlistMode.value = newVal?.status === 'RELEASING' ? 'episodic' : 'episodic';
  }
);

function handleClose() {
  showWaitlistConfirmation.value = false;
  emit('close');
}

async function startWaitlistFlow() {
  if (!props.anime) return;
  showWaitlistConfirmation.value = true;
  isResolvingTmdb.value = true;

  try {
    const res = await api.post<{
      candidates: MetadataCandidate[];
      recommended: MetadataCandidate | null;
    }>('/anime/resolve-tmdb', {
      anilistId: props.anime.id,
      title: displayTitle.value,
      romajiTitle: props.anime.title?.romaji,
      year: props.anime.startDate?.year || props.anime.seasonYear,
      format: props.anime.format,
    });

    tmdbCandidates.value = res.candidates || [];
    if (res.recommended) {
      selectedCandidateId.value = res.recommended.id;
    } else if (tmdbCandidates.value[0]) {
      selectedCandidateId.value = tmdbCandidates.value[0].id;
    }
  } catch {
    tmdbCandidates.value = [];
  } finally {
    isResolvingTmdb.value = false;
  }
}

async function confirmWaitlistSubmission() {
  if (!props.anime) return;
  const candidate = selectedTmdbCandidate.value;
  isSubmittingWaitlist.value = true;

  const targetEpisode = waitlistMode.value === 'episodic' ? 1 : null;

  try {
    await api.post('/waitlist', {
      mediaType: 'anime',
      title: candidate?.title || displayTitle.value,
      metadataId: candidate?.id || String(props.anime.id),
      metadataSource: candidate ? 'tmdb' : 'anilist',
      seasonNumber: 1,
      targetEpisode,
      posterUrl: candidate?.posterUrl || posterUrl.value,
    });

    requestsStore.showToast(`"${displayTitle.value}" added to Watcher Waitlist!`, 'success');
    handleClose();
  } catch (err: unknown) {
    requestsStore.showToast((err as Error).message || 'Failed to add to waitlist', 'error');
  } finally {
    isSubmittingWaitlist.value = false;
  }
}

async function submitDirectWaitlist() {
  if (!props.anime) return;
  isSubmittingWaitlist.value = true;
  try {
    await api.post('/waitlist', {
      mediaType: 'anime',
      title: displayTitle.value,
      metadataId: String(props.anime.id),
      metadataSource: 'anilist',
      seasonNumber: 1,
      targetEpisode: waitlistMode.value === 'episodic' ? 1 : null,
      posterUrl: posterUrl.value,
    });
    requestsStore.showToast(`"${displayTitle.value}" added to Watcher Waitlist!`, 'success');
    handleClose();
  } catch (err: unknown) {
    requestsStore.showToast((err as Error).message || 'Failed to add to waitlist', 'error');
  } finally {
    isSubmittingWaitlist.value = false;
  }
}
</script>
