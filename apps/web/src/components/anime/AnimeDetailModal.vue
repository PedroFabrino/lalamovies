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
        >
        <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

        <!-- Header Content Overlay -->
        <div class="absolute bottom-4 left-5 right-5 flex items-end gap-4">
          <img
            v-if="posterUrl"
            :src="posterUrl"
            :alt="displayTitle"
            class="w-20 sm:w-24 aspect-[3/4] object-cover rounded-lg shadow-2xl border border-zinc-700/60 flex-shrink-0"
          >
          <div class="flex-1 min-w-0 pb-1">
            <h2
              class="text-xl sm:text-2xl font-bold text-white truncate"
              :title="displayTitle"
            >
              {{ displayTitle }}
            </h2>
            <p
              v-if="subTitle && subTitle !== displayTitle"
              class="text-xs text-zinc-400 truncate mt-0.5"
            >
              {{ subTitle }}
            </p>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span
                class="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                :class="statusBadgeClasses"
              >
                {{ statusLabel }}
              </span>
              <WaitlistBadge v-if="isWaitlistedEffective" />
              <span
                v-if="anime.format"
                class="text-xs text-zinc-400"
              >{{ anime.format }}</span>
              <span
                v-if="anime.episodes"
                class="text-xs text-zinc-400"
              >• {{ anime.episodes }} episodes</span>
              <span
                v-if="anime.averageScore"
                class="text-xs font-semibold text-amber-400"
              >• ★ {{ anime.averageScore }}%</span>
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
            <!-- eslint-disable vue/no-v-html -->
            <div
              class="text-sm text-zinc-300 leading-relaxed max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700"
              v-html="cleanDescription"
            />
            <!-- eslint-enable vue/no-v-html -->
          </div>

          <!-- Action Buttons Row -->
          <div class="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-end gap-3">
            <template v-if="isAiringOrFinished">
              <button
                v-if="isWaitlistedEffective"
                type="button"
                disabled
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800/80 text-zinc-400 border border-zinc-700/40 cursor-not-allowed opacity-80"
                title="Already on your waitlist"
              >
                <span>✓</span> Waitlisted
              </button>
              <button
                v-else
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
                @click="handleDownloadClick"
              >
                <span>⬇️</span> Download Torrent
              </button>
            </template>

            <template v-else>
              <button
                v-if="isWaitlistedEffective"
                type="button"
                disabled
                class="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-zinc-800/80 text-zinc-400 flex items-center justify-center gap-2 border border-zinc-700/40 cursor-not-allowed opacity-80 shadow"
                title="Already on your waitlist"
              >
                <span>✓</span> Waitlisted
              </button>
              <button
                v-else
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
          :is-candidate-waitlisted="isCandidateWaitlisted"
          :action-type="pendingAction"
          @back="showWaitlistConfirmation = false"
          @update:selected-candidate-id="selectedCandidateId = $event"
          @update:target-season-number="targetSeasonNumber = $event"
          @update:target-episode-number="targetEpisodeNumber = $event"
          @update:waitlist-mode="waitlistMode = $event"
          @confirm="handleConfirmAction"
          @search-manual="handleManualTmdbSearch"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { SeasonalAnimeItem } from '../../composables/useSeasonalAnime';
import { api } from '../../lib/api';
import { useRequestsStore } from '../../stores/requests';
import { useWaitlistStore } from '../../stores/waitlist';
import { useWaitlistMatching } from '../../composables/useWaitlistMatching';
import { parseAnimeTitleAndSeason } from '../../lib/animeTitleCleaner';
import AnimeTmdbConfirmSection, { type MetadataCandidate } from './AnimeTmdbConfirmSection.vue';
import WaitlistBadge from '../WaitlistBadge.vue';

const props = withDefaults(
  defineProps<{ anime: SeasonalAnimeItem | null; isStreamingEnabled?: boolean; isWaitlisted?: boolean }>(),
  { isStreamingEnabled: true, isWaitlisted: false }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'download', anime: SeasonalAnimeItem, tmdb?: MetadataCandidate, options?: { seasonNumber?: number; episodeNumber?: number; downloadGranularity?: 'season' | 'episode' }): void;
  (e: 'stream', anime: SeasonalAnimeItem): void;
}>();

const requestsStore = useRequestsStore();
const waitlistStore = useWaitlistStore();
const { isItemWaitlisted, ensureWaitlistLoaded } = useWaitlistMatching();
const isWaitlistedEffective = computed(() => props.isWaitlisted || isItemWaitlisted(props.anime));

onMounted(ensureWaitlistLoaded);

const showWaitlistConfirmation = ref(false), isResolvingTmdb = ref(false), isSubmittingWaitlist = ref(false);
const pendingAction = ref<'waitlist' | 'download'>('waitlist');
const tmdbCandidates = ref<MetadataCandidate[]>([]), selectedCandidateId = ref<string>('');
const waitlistMode = ref<'episodic' | 'season_pack'>('episodic');
const targetSeasonNumber = ref<number>(1), targetEpisodeNumber = ref<number>(1);

const posterUrl = computed(() => props.anime?.coverImage?.extraLarge || props.anime?.coverImage?.large || props.anime?.coverImage?.medium || undefined);
const bannerUrl = computed(() => props.anime?.bannerImage || undefined);
const displayTitle = computed(() => props.anime?.title?.english || props.anime?.title?.romaji || 'Untitled');
const subTitle = computed(() => props.anime?.title?.romaji || props.anime?.title?.native || '');
const isAiringOrFinished = computed(() => props.anime?.status === 'RELEASING' || props.anime?.status === 'FINISHED');

const cleanDescription = computed(() => props.anime?.description ? props.anime.description.replace(/<br\s*\/?>/gi, '<br />') : 'No synopsis available.');
const trailerUrl = computed(() => (props.anime?.trailer?.id && props.anime.trailer.site?.toLowerCase() === 'youtube' ? `https://www.youtube.com/watch?v=${props.anime.trailer.id}` : null));
const statusLabel = computed(() => ({ RELEASING: 'Airing', FINISHED: 'Completed', NOT_YET_RELEASED: 'Upcoming' }[props.anime?.status || ''] || props.anime?.status || 'Anime'));
const statusBadgeClasses = computed(() => ({ RELEASING: 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400', NOT_YET_RELEASED: 'bg-indigo-950/70 border-indigo-700/60 text-indigo-300', FINISHED: 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300' }[props.anime?.status || ''] || 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400'));
const selectedTmdbCandidate = computed(() => tmdbCandidates.value.find((c) => c.id === selectedCandidateId.value) || tmdbCandidates.value[0] || null);

const isCandidateWaitlisted = computed(() => isItemWaitlisted({
  id: selectedTmdbCandidate.value?.id || props.anime?.id,
  title: selectedTmdbCandidate.value?.title || parseAnimeTitleAndSeason(displayTitle.value).cleanTitle,
  mediaType: 'anime',
  seasonNumber: targetSeasonNumber.value,
}));

watch(() => props.anime, () => {
  showWaitlistConfirmation.value = false;
  pendingAction.value = 'waitlist';
  tmdbCandidates.value = [];
  selectedCandidateId.value = '';
  waitlistMode.value = 'episodic';
  const parsed = parseAnimeTitleAndSeason(displayTitle.value);
  targetSeasonNumber.value = parsed.seasonNumber;
  targetEpisodeNumber.value = 1;
});

function handleClose() {
  showWaitlistConfirmation.value = false;
  emit('close');
}

function applyResolveResult(res: { candidates: MetadataCandidate[]; recommended: MetadataCandidate | null; detectedSeason?: number }) {
  tmdbCandidates.value = res.candidates || [];
  selectedCandidateId.value = res.recommended?.id || tmdbCandidates.value[0]?.id || '';
  if (typeof res.detectedSeason === 'number' && res.detectedSeason >= 1) {
    targetSeasonNumber.value = res.detectedSeason;
  }
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
    applyResolveResult(res);
  } catch {
    tmdbCandidates.value = [];
  } finally {
    isResolvingTmdb.value = false;
  }
}

function handleDownloadClick() {
  if (selectedTmdbCandidate.value) {
    emit('download', props.anime!, selectedTmdbCandidate.value, {
      seasonNumber: targetSeasonNumber.value,
      episodeNumber: waitlistMode.value === 'episodic' ? targetEpisodeNumber.value : undefined,
      downloadGranularity: waitlistMode.value === 'season_pack' ? 'season' : 'episode',
    });
    handleClose();
  } else {
    pendingAction.value = 'download';
    startWaitlistFlow();
  }
}

function handleConfirmAction() {
  if (pendingAction.value === 'download') {
    emit('download', props.anime!, selectedTmdbCandidate.value || undefined, {
      seasonNumber: targetSeasonNumber.value,
      episodeNumber: waitlistMode.value === 'episodic' ? targetEpisodeNumber.value : undefined,
      downloadGranularity: waitlistMode.value === 'season_pack' ? 'season' : 'episode',
    });
    handleClose();
  } else {
    confirmWaitlistSubmission();
  }
}

async function confirmWaitlistSubmission() {
  if (!props.anime) return;
  const candidate = selectedTmdbCandidate.value;
  if (!candidate || !candidate.id) {
    requestsStore.showToast('Please select a valid TMDB match first.', 'error');
    return;
  }
  const parsed = parseAnimeTitleAndSeason(displayTitle.value);
  const finalTitle = candidate.title || parsed.cleanTitle;

  if (isCandidateWaitlisted.value) {
    requestsStore.showToast(`"${finalTitle}" (S${targetSeasonNumber.value}) is already on your waitlist.`, 'info');
    handleClose();
    return;
  }

  isSubmittingWaitlist.value = true;
  const targetEpisode = waitlistMode.value === 'episodic' ? targetEpisodeNumber.value : null;

  try {
    await api.post('/waitlist', {
      mediaType: 'anime',
      title: finalTitle,
      metadataId: String(candidate.id),
      metadataSource: 'tmdb',
      seasonNumber: targetSeasonNumber.value,
      targetEpisode,
      posterUrl: candidate.posterUrl || posterUrl.value,
    });

    requestsStore.showToast(`"${finalTitle}" (S${targetSeasonNumber.value}) added to Watcher Waitlist!`, 'success');
    await waitlistStore.fetchAll();
    handleClose();
  } catch (err: unknown) {
    requestsStore.showToast((err as Error).message || 'Failed to add to waitlist', 'error');
  } finally {
    isSubmittingWaitlist.value = false;
  }
}

async function handleManualTmdbSearch(query: string) {
  if (!query.trim()) return;
  isResolvingTmdb.value = true;
  try {
    const res = await api.post<{
      candidates: MetadataCandidate[];
      recommended: MetadataCandidate | null;
      detectedSeason?: number;
    }>('/anime/resolve-tmdb', {
      title: query.trim(),
      format: props.anime?.format,
    });
    applyResolveResult(res);
  } catch {
    tmdbCandidates.value = [];
  } finally {
    isResolvingTmdb.value = false;
  }
}
</script>
