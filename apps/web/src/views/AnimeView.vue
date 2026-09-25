<template>
  <div
    class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col"
    data-testid="anime-view"
  >
    <Navbar />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Hero / Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-zinc-800/80">
        <div>
          <div class="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-wider uppercase mb-1">
            <span>⛩️</span> AniList Seasonal Guide
          </div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">
            Seasonal Anime
          </h1>
          <p class="text-sm text-zinc-400 mt-1 max-w-xl">
            Explore Japanese seasonal broadcast schedules, track anticipated sequels, and 1-click download or stream airing episodes.
          </p>
        </div>

        <!-- Quarter / Navigation Controls -->
        <div class="flex flex-wrap items-center gap-2 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800">
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
            :class="!isBrowsingArchive ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'"
            @click="resetToCurated(true)"
          >
            Curated Lineup
          </button>

          <!-- Dropdown Quarter Selector -->
          <div class="flex items-center gap-1 pl-2 border-l border-zinc-800">
            <select
              v-model="activeSeasonSelect"
              class="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs font-medium text-zinc-200 focus:outline-none focus:border-indigo-500"
              @change="handleQuarterChange"
            >
              <option
                v-for="opt in quarterOptions"
                :key="`${opt.season}-${opt.year}`"
                :value="`${opt.season}:${opt.year}`"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Error Alert -->
      <div
        v-if="error"
        class="mb-8 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between"
      >
        <span>{{ error }}</span>
        <button
          type="button"
          class="underline font-semibold ml-4 hover:text-white"
          @click="fetchSeasonalSections"
        >
          Retry
        </button>
      </div>

      <!-- Curated Mode Content -->
      <template v-if="!isBrowsingArchive">
        <!-- Anticipated Sequels Shelf (Top priority) -->
        <AnticipatedSequelsShelf
          :items="anticipatedSequels"
          :is-streaming-enabled="isStreamingEnabled"
          @select="openAnimeDetail"
          @download="handleDownload"
          @stream="handleStream"
          @waitlist="openAnimeWaitlist"
        />

        <!-- Trending Anime -->
        <SeasonalAnimeGrid
          title="🔥 Trending Anime"
          :items="trending"
          :is-loading="isLoading"
          test-id="trending-grid"
          :is-streaming-enabled="isStreamingEnabled"
          @select="openAnimeDetail"
          @download="handleDownload"
          @stream="handleStream"
          @waitlist="openAnimeWaitlist"
        />

        <!-- Popular This Season -->
        <SeasonalAnimeGrid
          title="🌸 Popular This Season"
          :items="popularThisSeason"
          :is-loading="isLoading"
          test-id="popular-grid"
          :is-streaming-enabled="isStreamingEnabled"
          @select="openAnimeDetail"
          @download="handleDownload"
          @stream="handleStream"
          @waitlist="openAnimeWaitlist"
        />

        <!-- Upcoming Next Season -->
        <SeasonalAnimeGrid
          title="❄️ Upcoming Next Season"
          :items="filteredUpcoming"
          :is-loading="isLoading"
          test-id="upcoming-grid"
          :show-library-filter="true"
          :current-filter="upcomingFilter"
          :library-count="anticipatedSequels.length"
          :is-streaming-enabled="isStreamingEnabled"
          @update:filter="upcomingFilter = $event"
          @select="openAnimeDetail"
          @download="handleDownload"
          @stream="handleStream"
          @waitlist="openAnimeWaitlist"
        />
      </template>

      <!-- Archive Browsing Mode Content -->
      <template v-else>
        <SeasonalAnimeGrid
          :title="`${selectedSeason} ${selectedYear} Catalog`"
          :items="archiveItems"
          :is-loading="isLoadingArchive"
          :page-info="archivePageInfo"
          test-id="archive-grid"
          :is-streaming-enabled="isStreamingEnabled"
          @select="openAnimeDetail"
          @download="handleDownload"
          @stream="handleStream"
          @waitlist="openAnimeWaitlist"
          @page-change="handlePageChange"
        />
      </template>
    </main>

    <!-- Anime Detail Modal -->
    <AnimeDetailModal
      v-if="selectedAnime"
      :anime="selectedAnime"
      :is-streaming-enabled="isStreamingEnabled"
      @close="selectedAnime = null"
      @download="handleDownload"
      @stream="handleStream"
    />

    <!-- Stream Progress Modal -->
    <StreamProgressModal
      :show="showStreamModal"
      :stream-id="streamModalId"
      :title="streamModalTitle"
      :status="streamModalStatus"
      :error="streamModalError"
      @close="showStreamModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import StreamProgressModal from '../components/StreamProgressModal.vue';
import AnticipatedSequelsShelf from '../components/anime/AnticipatedSequelsShelf.vue';
import SeasonalAnimeGrid from '../components/anime/SeasonalAnimeGrid.vue';
import AnimeDetailModal from '../components/anime/AnimeDetailModal.vue';
import { useSeasonalAnime, type SeasonalAnimeItem, type MediaSeason } from '../composables/useSeasonalAnime';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import { api } from '../lib/api';

const router = useRouter();
const featureFlags = useFeatureFlags();

const isStreamingEnabled = computed(() => featureFlags.isEnabled('streaming'));

const {
  isLoading,
  error,
  trending,
  popularThisSeason,
  anticipatedSequels,
  selectedSeason,
  selectedYear,
  isBrowsingArchive,
  archiveItems,
  archivePageInfo,
  isLoadingArchive,
  upcomingFilter,
  filteredUpcoming,
  fetchSeasonalSections,
  fetchArchive,
  selectSeasonAndYear,
  resetToCurated,
  initFromRoute,
} = useSeasonalAnime();

const selectedAnime = ref<SeasonalAnimeItem | null>(null);

// Stream modal state
const showStreamModal = ref(false);
const streamModalId = ref('');
const streamModalTitle = ref('');
const streamModalStatus = ref<'pending' | 'ready' | 'error'>('pending');
const streamModalError = ref('');

// Quarter Select dropdown state
const activeSeasonSelect = computed({
  get: () => `${selectedSeason.value}:${selectedYear.value}`,
  set: (val: string) => {
    const [s, y] = val.split(':');
    if (s && y) {
      selectSeasonAndYear(s as MediaSeason, parseInt(y, 10), true);
    }
  },
});

const quarterOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const seasons: MediaSeason[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const opts: Array<{ season: MediaSeason; year: number; label: string }> = [];

  for (let y = currentYear + 1; y >= currentYear - 3; y--) {
    for (let i = seasons.length - 1; i >= 0; i--) {
      const s = seasons[i];
      opts.push({ season: s, year: y, label: `${s} ${y}` });
    }
  }
  return opts;
});

function handleQuarterChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  activeSeasonSelect.value = target.value;
}

function handlePageChange(newPage: number) {
  fetchArchive(selectedSeason.value, selectedYear.value, newPage);
}

function openAnimeDetail(anime: SeasonalAnimeItem) {
  selectedAnime.value = anime;
}

function openAnimeWaitlist(anime: SeasonalAnimeItem) {
  selectedAnime.value = anime;
}

function handleDownload(anime: SeasonalAnimeItem) {
  const title = anime.title?.english || anime.title?.romaji || '';
  router.push({
    path: '/request',
    query: {
      query: title,
      mediaType: 'anime',
    },
  });
}

async function handleStream(anime: SeasonalAnimeItem) {
  const title = anime.title?.english || anime.title?.romaji || 'Anime';
  streamModalTitle.value = title;
  streamModalStatus.value = 'pending';
  streamModalError.value = '';
  showStreamModal.value = true;

  try {
    // Initiate stream request via stream API
    const res = await api.post<{ streamId: string; status: 'pending' | 'ready' }>('/streams', {
      title,
      isPrivateTracker: false,
    });
    streamModalId.value = res.streamId;
    if (res.status === 'ready') {
      streamModalStatus.value = 'ready';
    }
  } catch (err: unknown) {
    streamModalStatus.value = 'error';
    streamModalError.value = (err as Error).message || 'Failed to start instant stream';
  }
}

onMounted(() => {
  featureFlags.ensureFlagsLoaded();
  initFromRoute();
  fetchSeasonalSections();
});
</script>
