import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { api, ApiError } from '../lib/api';
import type { MediaType } from '../stores/requests';
import {
  type ReleaseCandidate,
  type CandidateSortOption,
  SORT_OPTIONS,
  sortReleaseCandidates,
  isKnownPrivateIndexer,
} from '../lib/releaseExplorer';
import type { MetadataCandidate } from './requestTypes';

export interface UseRequestReleasesOptions {
  mediaType: Ref<MediaType>;
  seasonNumber: Ref<number | null>;
  downloadGranularity: Ref<'season' | 'episode'>;
  episodeNumber: Ref<number | null>;
  activeAnimeTitle: Ref<string | null>;
  selectedCandidate: Ref<MetadataCandidate | null>;
  magnetLink: Ref<string>;
  isStreamingEnabled: ComputedRef<boolean>;
}

export function useRequestReleases(options: UseRequestReleasesOptions) {
  const {
    mediaType,
    seasonNumber,
    downloadGranularity,
    episodeNumber,
    activeAnimeTitle,
    selectedCandidate,
    magnetLink,
    isStreamingEnabled,
  } = options;

  const isSearchingReleases = ref(false);
  const recommendedRelease = ref<ReleaseCandidate | null>(null);
  const selectedRelease = ref<ReleaseCandidate | null>(null);
  const releaseCandidates = ref<ReleaseCandidate[]>([]);
  const isExplorerExpanded = ref(false);
  const candidateSortBy = ref<CandidateSortOption>('score');
  const sortOptions = SORT_OPTIONS;

  const rdCacheMap = ref<Record<string, boolean>>({});
  const hideInfringing = ref(true);
  const infringingCount = computed(() => releaseCandidates.value.filter((c) => c.isInfringing).length);
  const activeRelease = computed(() => selectedRelease.value || recommendedRelease.value);
  const sortedReleaseCandidates = computed(() => {
    let list = releaseCandidates.value;
    if (hideInfringing.value) {
      list = list.filter((c) => !c.isInfringing);
    }
    return sortReleaseCandidates(list, candidateSortBy.value);
  });

  const isProwlarrConfigured = ref(true);
  const isProwlarrReachable = ref(true);
  const hasHealthyReleases = ref(true);
  const showLowHealthAnyway = ref(false);
  const isManualFallbackInStep3 = ref(false);
  const manualFallbackMode = ref<'magnet' | 'file'>('magnet');
  const fallbackMagnetLink = ref('');
  const fallbackFile = ref<File | null>(null);

  function extractInfoHash(url: string): string {
    if (!url) return '';
    const match = url.match(/urn:btih:([a-zA-Z0-9]+)/i);
    return match ? match[1].toLowerCase() : '';
  }

  function getCandidateCacheStatus(candidate: ReleaseCandidate): boolean | undefined {
    if (candidate.isPrivateTracker) return undefined;
    const hash = (candidate.infoHash || extractInfoHash(candidate.downloadUrl)).toLowerCase();
    return hash ? rdCacheMap.value[hash] : undefined;
  }

  async function checkCacheForCandidates(candidateList: ReleaseCandidate[]) {
    if (!isStreamingEnabled.value) return;

    const publicHashes = candidateList
      .filter((c) => !c.isPrivateTracker)
      .map((c) => (c.infoHash || extractInfoHash(c.downloadUrl)).toLowerCase())
      .filter(Boolean);

    if (publicHashes.length === 0) return;

    try {
      const res = await api.get<{ cached: Record<string, boolean> }>(
        `/api/streams/cache-check?hashes=${publicHashes.join(',')}`
      );
      if (res && res.cached) {
        rdCacheMap.value = { ...rdCacheMap.value, ...res.cached };
      }
    } catch {
      // Non-blocking
    }
  }

  function selectRelease(candidate: ReleaseCandidate) {
    selectedRelease.value = candidate;
    magnetLink.value = candidate.downloadUrl;
  }

  function resetToRecommendedRelease() {
    if (recommendedRelease.value) {
      selectedRelease.value = recommendedRelease.value;
      magnetLink.value = recommendedRelease.value.downloadUrl;
    }
  }

  function handleFallbackFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      fallbackFile.value = target.files[0];
    }
  }

  function switchToManualUpload() {
    isManualFallbackInStep3.value = true;
    manualFallbackMode.value = 'magnet';
  }

  function getSearchTitles(candidate: MetadataCandidate) {
    let primaryTitle = candidate.title;
    let fallbackTitle = candidate.englishTitle || null;

    if (mediaType.value === 'anime') {
      const isEnglishSelected = Boolean(candidate.englishTitle && activeAnimeTitle.value === candidate.englishTitle);
      primaryTitle = isEnglishSelected
        ? candidate.englishTitle!
        : (activeAnimeTitle.value || candidate.title);
      fallbackTitle = isEnglishSelected
        ? (candidate.romajiTitle || candidate.title)
        : (candidate.englishTitle || null);
    }
    return { primaryTitle, fallbackTitle };
  }

  async function searchReleasesApi(candidate: MetadataCandidate) {
    const effectiveEpisode = downloadGranularity.value === 'episode' ? (episodeNumber.value ?? 1) : null;
    const effectiveSeason = mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : null;
    const { primaryTitle, fallbackTitle } = getSearchTitles(candidate);

    const data = await api.post<{
      recommended: ReleaseCandidate | null;
      candidates: ReleaseCandidate[];
      totalFound: number;
      isConfigured: boolean;
      isReachable?: boolean;
      hasHealthyReleases?: boolean;
    }>('/requests/search-releases', {
      metadataId: candidate.id,
      metadataSource: candidate.source,
      mediaType: mediaType.value,
      title: primaryTitle,
      year: candidate.year,
      seasonNumber: effectiveSeason,
      episodeNumber: effectiveEpisode,
      romajiTitle: candidate.romajiTitle || null,
      englishTitle: fallbackTitle || candidate.englishTitle || candidate.title,
    });

    const candidates = (data.candidates || []).map((c) => ({
      ...c,
      isPrivateTracker: c.isPrivateTracker ?? isKnownPrivateIndexer(c.indexer),
    }));
    const recommended = data.recommended
      ? { ...data.recommended, isPrivateTracker: data.recommended.isPrivateTracker ?? isKnownPrivateIndexer(data.recommended.indexer) }
      : null;

    return { data, candidates, recommended };
  }

  async function fetchReleasesForCandidate(candidate: MetadataCandidate) {
    isSearchingReleases.value = true;
    recommendedRelease.value = null;
    selectedRelease.value = null;
    releaseCandidates.value = [];
    showLowHealthAnyway.value = false;
    isManualFallbackInStep3.value = false;
    fallbackMagnetLink.value = '';
    fallbackFile.value = null;

    try {
      const { data, candidates, recommended } = await searchReleasesApi(candidate);
      isProwlarrConfigured.value = data.isConfigured;
      isProwlarrReachable.value = data.isReachable ?? true;
      hasHealthyReleases.value = data.hasHealthyReleases ?? candidates.some((c) => !c.isLowHealth);
      recommendedRelease.value = recommended;
      releaseCandidates.value = candidates;
      selectedRelease.value = recommended;

      if (releaseCandidates.value.length > 0) checkCacheForCandidates(releaseCandidates.value);
      if (selectedRelease.value) magnetLink.value = selectedRelease.value.downloadUrl;
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const d = err.data as { isConfigured?: boolean; isReachable?: boolean };
        isProwlarrConfigured.value = d.isConfigured ?? false;
        isProwlarrReachable.value = d.isReachable ?? false;
      }
      hasHealthyReleases.value = false;
    } finally {
      isSearchingReleases.value = false;
    }
  }

  async function reloadReleasesSilently() {
    if (!selectedCandidate.value) return;
    try {
      const { data, candidates, recommended } = await searchReleasesApi(selectedCandidate.value);
      isProwlarrConfigured.value = data.isConfigured;
      isProwlarrReachable.value = data.isReachable ?? true;
      hasHealthyReleases.value = data.hasHealthyReleases ?? candidates.some((c) => !c.isLowHealth);
      releaseCandidates.value = candidates;
      recommendedRelease.value = recommended;

      if (selectedRelease.value && (selectedRelease.value.isInfringing || candidates.find((c) => c.guid === selectedRelease.value?.guid)?.isInfringing)) {
        selectedRelease.value = recommended;
        if (recommended) magnetLink.value = recommended.downloadUrl;
      }
      if (releaseCandidates.value.length > 0) checkCacheForCandidates(releaseCandidates.value);
    } catch (err) {
      console.error('Silent release reload failed:', err);
    }
  }

  return {
    isSearchingReleases,
    recommendedRelease,
    selectedRelease,
    releaseCandidates,
    isExplorerExpanded,
    candidateSortBy,
    sortOptions,
    rdCacheMap,
    hideInfringing,
    infringingCount,
    activeRelease,
    sortedReleaseCandidates,
    isProwlarrConfigured,
    isProwlarrReachable,
    hasHealthyReleases,
    showLowHealthAnyway,
    isManualFallbackInStep3,
    manualFallbackMode,
    fallbackMagnetLink,
    fallbackFile,
    extractInfoHash,
    getCandidateCacheStatus,
    checkCacheForCandidates,
    selectRelease,
    resetToRecommendedRelease,
    handleFallbackFileChange,
    switchToManualUpload,
    fetchReleasesForCandidate,
    reloadReleasesSilently,
  };
}
