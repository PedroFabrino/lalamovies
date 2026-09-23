import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../lib/api';

export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export interface AniListTitle {
  romaji: string;
  english: string | null;
  native: string | null;
}

export interface SeasonalAnimeItem {
  id: number;
  title: AniListTitle;
  format: string | null;
  status: string | null;
  episodes: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  startDate: { year: number | null; month: number | null; day: number | null } | null;
  coverImage: { extraLarge: string | null; large: string | null; medium: string | null };
  bannerImage: string | null;
  genres: string[];
  averageScore: number | null;
  popularity: number | null;
  description: string | null;
  trailer: { id: string | null; site: string | null } | null;
}

export interface AnticipatedSequelItem extends SeasonalAnimeItem {
  prequelTitle: string;
  matchedRelationType: string;
}

export interface PageInfo {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

export function useSeasonalAnime() {
  const route = useRoute();
  const router = useRouter();

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const trending = ref<SeasonalAnimeItem[]>([]);
  const popularThisSeason = ref<SeasonalAnimeItem[]>([]);
  const upcomingNextSeason = ref<SeasonalAnimeItem[]>([]);
  const anticipatedSequels = ref<AnticipatedSequelItem[]>([]);

  // Navigation / Tabs: 'curated' (trending + popular + upcoming) vs specific seasonal archive
  const selectedSeason = ref<MediaSeason>('SPRING');
  const selectedYear = ref<number>(new Date().getFullYear());
  const isBrowsingArchive = ref(false);

  const archiveItems = ref<SeasonalAnimeItem[]>([]);
  const archivePageInfo = ref<PageInfo | null>(null);
  const isLoadingArchive = ref(false);

  // Filter for Upcoming: 'all' vs 'library'
  const upcomingFilter = ref<'all' | 'library'>('all');

  const filteredUpcoming = computed(() => {
    if (upcomingFilter.value === 'library') {
      const libraryIds = new Set(anticipatedSequels.value.map((s) => s.id));
      return upcomingNextSeason.value.filter((item) => libraryIds.has(item.id));
    }
    return upcomingNextSeason.value;
  });

  async function fetchSeasonalSections() {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await api.get<{
        trending: SeasonalAnimeItem[];
        popularThisSeason: SeasonalAnimeItem[];
        upcomingNextSeason: SeasonalAnimeItem[];
        anticipatedSequels: AnticipatedSequelItem[];
      }>('/anime/seasonal');

      trending.value = res.trending || [];
      popularThisSeason.value = res.popularThisSeason || [];
      upcomingNextSeason.value = res.upcomingNextSeason || [];
      anticipatedSequels.value = res.anticipatedSequels || [];
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Failed to load seasonal anime';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchArchive(season: MediaSeason, year: number, page = 1) {
    isLoadingArchive.value = true;
    try {
      const res = await api.get<{
        pageInfo: PageInfo;
        items: SeasonalAnimeItem[];
      }>(`/anime/seasons?season=${season}&year=${year}&page=${page}&perPage=24`);

      archiveItems.value = res.items || [];
      archivePageInfo.value = res.pageInfo;
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Failed to load seasonal archive';
    } finally {
      isLoadingArchive.value = false;
    }
  }

  function selectSeasonAndYear(season: MediaSeason, year: number, updateRoute = true) {
    selectedSeason.value = season;
    selectedYear.value = year;
    isBrowsingArchive.value = true;

    if (updateRoute && router) {
      router.replace({
        query: {
          ...route.query,
          season,
          year: String(year),
        },
      });
    }

    fetchArchive(season, year, 1);
  }

  function resetToCurated(updateRoute = true) {
    isBrowsingArchive.value = false;
    if (updateRoute && router) {
      const query = { ...route.query };
      delete query.season;
      delete query.year;
      router.replace({ query });
    }
  }

  function initFromRoute() {
    const rawSeason = route.query.season as string | undefined;
    const rawYear = route.query.year as string | undefined;

    if (rawSeason && ['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(rawSeason)) {
      const parsedYear = rawYear ? parseInt(rawYear, 10) : new Date().getFullYear();
      if (!isNaN(parsedYear)) {
        selectedSeason.value = rawSeason as MediaSeason;
        selectedYear.value = parsedYear;
        isBrowsingArchive.value = true;
        fetchArchive(selectedSeason.value, selectedYear.value, 1);
        return;
      }
    }

    isBrowsingArchive.value = false;
  }

  // Watch route query changes
  watch(
    () => [route.query.season, route.query.year],
    ([newSeason, newYear]) => {
      if (newSeason && ['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(String(newSeason))) {
        const y = newYear ? parseInt(String(newYear), 10) : new Date().getFullYear();
        if (!isNaN(y) && (selectedSeason.value !== newSeason || selectedYear.value !== y || !isBrowsingArchive.value)) {
          selectedSeason.value = newSeason as MediaSeason;
          selectedYear.value = y;
          isBrowsingArchive.value = true;
          fetchArchive(selectedSeason.value, selectedYear.value, 1);
        }
      } else if (!newSeason && !newYear && isBrowsingArchive.value) {
        isBrowsingArchive.value = false;
      }
    }
  );

  return {
    isLoading,
    error,
    trending,
    popularThisSeason,
    upcomingNextSeason,
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
  };
}
