<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    data-testid="waitlist-modal"
  >
    <div
      class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-white">
            {{ modalStep === 'confirm' ? 'Confirm Waitlist Entry' : 'Add to Waitlist' }}
          </h3>
          <p class="text-xs text-zinc-400 mt-0.5">
            {{ modalStep === 'confirm'
              ? 'Review details before adding to your tracker monitor'
              : 'Search TMDB for movies or series to monitor' }}
          </p>
        </div>
        <button
          type="button"
          class="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
          @click="closeModal"
        >
          <svg
            class="w-5 h-5"
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
        </button>
      </div>

      <!-- Step 1: Search TMDB -->
      <WaitlistModalSearchStep
        v-if="modalStep === 'search'"
        v-model:search-query="searchQuery"
        v-model:search-media-type="searchMediaType"
        :media-type-options="mediaTypeOptions"
        :is-searching="isSearching"
        :has-searched="hasSearched"
        :candidates="candidates"
        :is-item-waitlisted="isItemWaitlisted"
        @submit-search="handleSearch"
        @select="selectCandidate"
      />

      <!-- Step 2: Confirm Selection & Target Configuration -->
      <WaitlistModalConfirmStep
        v-else-if="modalStep === 'confirm'"
        v-model:selected-season-number="selectedSeasonNumber"
        v-model:selected-episode-number="selectedEpisodeNumber"
        :selected-candidate="selectedCandidate"
        :selected-media-type="selectedMediaType"
        :target-air-date="targetAirDate"
        :series-progress="seriesProgress"
        :library-status="libraryStatus"
        :available-releases-count="availableReleasesCount"
        :is-candidate-already-waitlisted="isCandidateAlreadyWaitlisted"
        :is-submitting="isSubmitting"
        :is-prefilled="isPrefilled"
        @back="modalStep = 'search'"
        @cancel="closeModal"
        @confirm="submitWaitlistEntry"
        @download-directly="downloadDirectly"
        @change-guards="checkCandidateGuards"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WaitlistModalSearchStep from './WaitlistModalSearchStep.vue';
import WaitlistModalConfirmStep from './WaitlistModalConfirmStep.vue';
import type { WaitlistCandidate, SeriesProgressResponse } from './waitlistModalTypes';
import { useWaitlistStore } from '../../stores/waitlist';
import { useWaitlistMatching } from '../../composables/useWaitlistMatching';
import { api } from '../../lib/api';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'added'): void;
}>();

const route = useRoute();
const router = useRouter();
const waitlistStore = useWaitlistStore();
const { isItemWaitlisted } = useWaitlistMatching();

const modalStep = ref<'search' | 'confirm'>('search');
const isPrefilled = ref(false);
const isSearching = ref(false);
const hasSearched = ref(false);
const isSubmitting = ref(false);

const searchQuery = ref('');
const searchMediaType = ref<'movie' | 'tv_show' | 'anime'>('movie');
const candidates = ref<WaitlistCandidate[]>([]);

const selectedCandidate = ref<WaitlistCandidate | null>(null);
const selectedMediaType = ref<'movie' | 'tv_show' | 'anime'>('movie');
const selectedSeasonNumber = ref<number>(1);
const selectedEpisodeNumber = ref<number | null>(1);
const targetAirDate = ref<string | null>(null);
const seriesProgress = ref<SeriesProgressResponse | null>(null);

const libraryStatus = ref<{ inLibrary: boolean; hasExisting: boolean; status?: string | null } | null>(null);
const availableReleasesCount = ref(0);

const mediaTypeOptions = [
  { value: 'movie' as const, label: 'Movie', icon: '🎬' },
  { value: 'tv_show' as const, label: 'TV Show', icon: '📺' },
  { value: 'anime' as const, label: 'Anime', icon: '⛩️' },
];

const isCandidateAlreadyWaitlisted = computed(() => {
  if (!selectedCandidate.value) return false;
  return isItemWaitlisted({
    id: selectedCandidate.value.id,
    title: selectedCandidate.value.title,
    mediaType: selectedMediaType.value,
    seasonNumber: ['tv_show', 'anime'].includes(selectedMediaType.value) ? (selectedSeasonNumber.value || 1) : undefined,
  });
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && !isPrefilled.value && modalStep.value === 'search' && !hasSearched.value) {
      searchQuery.value = '';
      candidates.value = [];
    }
  },
);

onMounted(() => {
  if (route.query.add === 'true' && route.query.title) {
    initPrefilledModal();
  }
});

async function checkCandidateGuards() {
  if (!selectedCandidate.value) return;
  libraryStatus.value = null;
  availableReleasesCount.value = 0;

  try {
    const params = new URLSearchParams();
    if (selectedCandidate.value.id) params.append('metadataId', String(selectedCandidate.value.id));
    if (selectedCandidate.value.title) params.append('title', selectedCandidate.value.title);
    params.append('mediaType', selectedMediaType.value);
    if (['tv_show', 'anime'].includes(selectedMediaType.value)) {
      if (selectedSeasonNumber.value) params.append('seasonNumber', String(selectedSeasonNumber.value));
      if (selectedEpisodeNumber.value) params.append('episodeNumber', String(selectedEpisodeNumber.value));
    }

    const data = await api.get<SeriesProgressResponse>(`/requests/series-progress?${params.toString()}`);
    libraryStatus.value = {
      inLibrary: Boolean(data?.inLibrary),
      hasExisting: Boolean(data?.hasExisting),
      status: data?.status || null,
    };

    if (['tv_show', 'anime'].includes(selectedMediaType.value)) {
      seriesProgress.value = data;
      if (data?.hasExisting) {
        if (data.existingMediaType && ['tv_show', 'anime'].includes(data.existingMediaType)) {
          selectedMediaType.value = data.existingMediaType as 'tv_show' | 'anime';
        }
        if (data.existingTitle && selectedCandidate.value) {
          selectedCandidate.value.title = data.existingTitle;
        }
      }
      if (selectedEpisodeNumber.value === null) {
        selectedEpisodeNumber.value = data?.hasExisting ? (data.suggestedEpisode || 1) : 1;
      }
      targetAirDate.value = data?.airDate || null;
    }
  } catch {
    libraryStatus.value = null;
  }

  try {
    const relData = await api.post<{ releases?: unknown[] }>('/requests/search-releases', {
      metadataId: String(selectedCandidate.value.id),
      metadataSource: selectedCandidate.value.source || 'tmdb',
      mediaType: selectedMediaType.value,
      title: selectedCandidate.value.title,
      year: selectedCandidate.value.year,
      seasonNumber: ['tv_show', 'anime'].includes(selectedMediaType.value) ? (selectedSeasonNumber.value || 1) : undefined,
      episodeNumber: ['tv_show', 'anime'].includes(selectedMediaType.value) ? (selectedEpisodeNumber.value || 1) : undefined,
    });
    if (Array.isArray(relData?.releases)) {
      availableReleasesCount.value = relData.releases.length;
    }
  } catch {
    availableReleasesCount.value = 0;
  }
}

function downloadDirectly() {
  if (!selectedCandidate.value) return;
  const candidate = selectedCandidate.value;
  const mType = selectedMediaType.value;
  const sNum = selectedSeasonNumber.value;
  const epNum = selectedEpisodeNumber.value;
  closeModal();
  router.push({
    path: '/requests',
    query: {
      search: candidate.title,
      title: candidate.title,
      year: candidate.year ? String(candidate.year) : undefined,
      mediaType: mType,
      metadataId: String(candidate.id),
      metadataSource: candidate.source || 'tmdb',
      seasonNumber: ['tv_show', 'anime'].includes(mType) ? String(sNum || 1) : undefined,
      episodeNumber: ['tv_show', 'anime'].includes(mType) && epNum ? String(epNum) : undefined,
    },
  });
}

function closeModal() {
  emit('close');
  modalStep.value = 'search';
  isPrefilled.value = false;
  seriesProgress.value = null;
  libraryStatus.value = null;
  availableReleasesCount.value = 0;
  targetAirDate.value = null;
  if (route.query.add) {
    router.replace({ path: '/waitlist', query: {} });
  }
}

async function initPrefilledModal() {
  isPrefilled.value = true;
  modalStep.value = 'confirm';
  const query = route.query;
  const mType = typeof query.mediaType === 'string' ? query.mediaType : 'movie';
  selectedMediaType.value = ['movie', 'tv_show', 'anime'].includes(mType) ? (mType as 'movie' | 'tv_show' | 'anime') : 'movie';
  selectedSeasonNumber.value = query.seasonNumber ? Number(query.seasonNumber) : 1;
  selectedEpisodeNumber.value = query.targetEpisode || query.episodeNumber ? Number(query.targetEpisode || query.episodeNumber) : 1;
  if (query.releaseDate) {
    targetAirDate.value = String(query.releaseDate);
  }
  selectedCandidate.value = {
    id: String(query.metadataId || ''),
    source: String(query.metadataSource || 'tmdb'),
    title: String(query.title || ''),
    year: query.year ? Number(query.year) : undefined,
    posterUrl: query.posterUrl ? String(query.posterUrl) : null,
  };
  await checkCandidateGuards();
}

async function handleSearch() {
  if (!searchQuery.value.trim()) return;
  isSearching.value = true;
  hasSearched.value = true;
  candidates.value = [];
  try {
    const data = await api.post<{ candidates: WaitlistCandidate[] }>('/requests/search-metadata', {
      query: searchQuery.value.trim(),
      mediaType: searchMediaType.value,
    });
    candidates.value = data.candidates || [];
  } catch (err: unknown) {
    waitlistStore.showToast((err as Error).message || 'Failed to search metadata', 'error');
  } finally {
    isSearching.value = false;
  }
}

async function selectCandidate(candidate: WaitlistCandidate) {
  selectedCandidate.value = candidate;
  selectedMediaType.value = searchMediaType.value;
  selectedSeasonNumber.value = 1;
  selectedEpisodeNumber.value = null;
  targetAirDate.value = candidate.releaseDate || null;
  seriesProgress.value = null;
  libraryStatus.value = null;
  availableReleasesCount.value = 0;
  modalStep.value = 'confirm';
  await checkCandidateGuards();
}

async function submitWaitlistEntry() {
  if (!selectedCandidate.value) return;
  if (isCandidateAlreadyWaitlisted.value) {
    waitlistStore.showToast('This item is already on your waitlist.', 'info');
    return;
  }
  isSubmitting.value = true;
  try {
    await waitlistStore.addEntry({
      mediaType: selectedMediaType.value,
      metadataId: String(selectedCandidate.value.id),
      metadataSource: selectedCandidate.value.source === 'anilist' ? 'anilist' : 'tmdb',
      title: selectedCandidate.value.title,
      year: selectedCandidate.value.year || undefined,
      seasonNumber: ['tv_show', 'anime'].includes(selectedMediaType.value) ? (selectedSeasonNumber.value || 1) : undefined,
      targetEpisode: ['tv_show', 'anime'].includes(selectedMediaType.value) ? (selectedEpisodeNumber.value || 1) : undefined,
      tmdbReleaseDate: targetAirDate.value || null,
      posterUrl: selectedCandidate.value.posterUrl || undefined,
    });
    emit('added');
    closeModal();
  } catch {
    // Error is handled and toasted in store
  } finally {
    isSubmitting.value = false;
  }
}

defineExpose({
  openSearchModal() {
    isPrefilled.value = false;
    modalStep.value = 'search';
    searchQuery.value = '';
    candidates.value = [];
    hasSearched.value = false;
    selectedCandidate.value = null;
    seriesProgress.value = null;
    libraryStatus.value = null;
    availableReleasesCount.value = 0;
    targetAirDate.value = null;
  },
  selectCandidate,
  searchMediaType,
});
</script>
