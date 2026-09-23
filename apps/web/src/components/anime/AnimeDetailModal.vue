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

        <!-- TMDB Confirmation Step Sub-Component -->
        <AnimeTmdbConfirmSection
          v-else
          :is-resolving-tmdb="isResolvingTmdb"
          :tmdb-candidates="tmdbCandidates"
          :selected-candidate-id="selectedCandidateId"
          :target-season-number="targetSeasonNumber"
          :target-episode-number="targetEpisodeNumber"
          :waitlist-mode="waitlistMode"
          :is-submitting-waitlist="isSubmittingWaitlist"
          @back="showWaitlistConfirmation = false"
          @update:selected-candidate-id="selectedCandidateId = $event"
          @update:target-season-number="targetSeasonNumber = $event"
          @update:target-episode-number="targetEpisodeNumber = $event"
          @update:waitlist-mode="waitlistMode = $event"
          @confirm="confirmWaitlistSubmission"
          @submit-direct="submitDirectWaitlist"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { SeasonalAnimeItem } from '../../composables/useSeasonalAnime';
import { api } from '../../lib/api';
import { useRequestsStore } from '../../stores/requests';
import { parseAnimeTitleAndSeason } from '../../lib/animeTitleCleaner';
import AnimeTmdbConfirmSection, { type MetadataCandidate } from './AnimeTmdbConfirmSection.vue';

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
const targetSeasonNumber = ref<number>(1);
const targetEpisodeNumber = ref<number>(1);

const posterUrl = computed(() => {
  if (!props.anime) return undefined;
  return (
    props.anime.coverImage?.extraLarge ||
    props.anime.coverImage?.large ||
    props.anime.coverImage?.medium ||
    undefined
  );
});

const bannerUrl = computed(() => props.anime?.bannerImage || undefined);
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
    const parsed = parseAnimeTitleAndSeason(displayTitle.value);
    targetSeasonNumber.value = parsed.seasonNumber;
    targetEpisodeNumber.value = 1;
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

  const parsed = parseAnimeTitleAndSeason(displayTitle.value);
  targetSeasonNumber.value = parsed.seasonNumber;
  targetEpisodeNumber.value = 1;

  try {
    const res = await api.post<{
      candidates: MetadataCandidate[];
      recommended: MetadataCandidate | null;
      detectedSeason?: number;
      cleanTitle?: string;
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

    if (typeof res.detectedSeason === 'number' && res.detectedSeason >= 1) {
      targetSeasonNumber.value = res.detectedSeason;
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

  const targetEpisode = waitlistMode.value === 'episodic' ? targetEpisodeNumber.value : null;
  const parsed = parseAnimeTitleAndSeason(displayTitle.value);
  const finalTitle = candidate?.title || parsed.cleanTitle;

  try {
    await api.post('/waitlist', {
      mediaType: 'anime',
      title: finalTitle,
      metadataId: candidate?.id || String(props.anime.id),
      metadataSource: candidate ? 'tmdb' : 'anilist',
      seasonNumber: targetSeasonNumber.value,
      targetEpisode,
      posterUrl: candidate?.posterUrl || posterUrl.value,
    });

    requestsStore.showToast(`"${finalTitle}" (S${targetSeasonNumber.value}) added to Watcher Waitlist!`, 'success');
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
  const parsed = parseAnimeTitleAndSeason(displayTitle.value);
  const finalTitle = parsed.cleanTitle;

  try {
    await api.post('/waitlist', {
      mediaType: 'anime',
      title: finalTitle,
      metadataId: String(props.anime.id),
      metadataSource: 'anilist',
      seasonNumber: targetSeasonNumber.value,
      targetEpisode: waitlistMode.value === 'episodic' ? targetEpisodeNumber.value : null,
      posterUrl: posterUrl.value,
    });
    requestsStore.showToast(`"${finalTitle}" (S${targetSeasonNumber.value}) added to Watcher Waitlist!`, 'success');
    handleClose();
  } catch (err: unknown) {
    requestsStore.showToast((err as Error).message || 'Failed to add to waitlist', 'error');
  } finally {
    isSubmittingWaitlist.value = false;
  }
}
</script>
