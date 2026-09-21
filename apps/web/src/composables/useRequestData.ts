import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api, ApiError } from '../lib/api';
import { useRequestsStore, MediaType, DownloadRequest } from '../stores/requests';
import { useAuthStore } from '../stores/auth';
import { useFeatureFlags } from './useFeatureFlags';
import { formatBytes } from '../lib/formatters';
import { parseTorrentFile, fileToBase64, ParsedTorrentClient } from '../lib/torrentParser';
import { cleanTorrentTitle, extractEpisodeInfo } from '../lib/torrentTitleCleaner';
import {
  type ReleaseCandidate,
  type CandidateSortOption,
  SORT_OPTIONS,
  sortReleaseCandidates,
  isKnownPrivateIndexer,
} from '../lib/releaseExplorer';

export interface MetadataCandidate {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
  romajiTitle?: string | null;
  englishTitle?: string | null;
}

export type { ReleaseCandidate };

export interface BatchItem {
  id: string;
  file: File;
  fileName: string;
  fileSizeBytes: number;
  parsed?: ParsedTorrentClient;
  error?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface CanonicalRequestSummary {
  id: string;
  title: string;
  status: string;
  mediaType: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

export function useRequestData() {
  const router = useRouter();
  const route = useRoute();
  const requestsStore = useRequestsStore();
  const authStore = useAuthStore();
  const featureFlags = useFeatureFlags();

  const isManualTorrentsEnabled = computed(() => featureFlags.isEnabled('manual_torrents'));
  const isStreamingEnabled = computed(() => featureFlags.isEnabled('streaming'));

  const hasCjk = (s?: string | null): boolean =>
    Boolean(s && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(s));

  const currentStep = ref<1 | 2 | 3>(1);
  const waitlistNextSeason = ref(false);
  const watchForNextEpisodes = ref(false);
  const notifyBeforeEachDownload = ref(false);

  // Step 1 State
  const inputMode = ref<'search' | 'magnet' | 'file'>('search');
  const magnetLink = ref('');
  const isSearchingReleases = ref(false);
  const recommendedRelease = ref<ReleaseCandidate | null>(null);
  const selectedRelease = ref<ReleaseCandidate | null>(null);
  const releaseCandidates = ref<ReleaseCandidate[]>([]);
  const isExplorerExpanded = ref(false);
  const candidateSortBy = ref<CandidateSortOption>('score');
  const sortOptions = SORT_OPTIONS;

  const rdCacheMap = ref<Record<string, boolean>>({});
  const showStreamModal = ref(false);
  const streamModalId = ref('');
  const streamModalTitle = ref('');
  const streamModalStatus = ref<'pending' | 'ready' | 'error'>('pending');
  const streamModalError = ref('');

  const selectedFile = ref<File | null>(null);
  const batchItems = ref<BatchItem[]>([]);
  const batchSeasonInput = ref<number | null>(1);

  const validBatchItems = computed(() => batchItems.value.filter((i) => !i.error));
  const invalidBatchItems = computed(() => batchItems.value.filter((i) => Boolean(i.error)));
  const totalBatchSize = computed(() =>
    validBatchItems.value.reduce((acc, i) => acc + (i.parsed?.totalSize || i.fileSizeBytes), 0)
  );

  const mediaType = ref<MediaType>('movie');
  const customQuery = ref('');
  const isSearching = ref(false);
  const step1Error = ref<string | null>(null);

  const step1Ref = ref<{ customQueryInputRef: HTMLInputElement | null } | null>(null);
  const step2Ref = ref<{ step2QueryInputRef: HTMLInputElement | null } | null>(null);

  const mediaTypeOptions = computed<{ value: MediaType; label: string; icon: string }[]>(() => {
    const options: { value: MediaType; label: string; icon: string }[] = [
      { value: 'movie', label: 'Movie', icon: '🎬' },
      { value: 'tv_show', label: 'TV Show', icon: '📺' },
      { value: 'anime', label: 'Anime', icon: '⛩️' },
    ];
    if (authStore.isTrusted) {
      options.push({ value: 'private', label: 'Private', icon: '🔒' });
    }
    return options;
  });

  // Step 2 State
  const candidates = ref<MetadataCandidate[]>([]);
  const selectedCandidate = ref<MetadataCandidate | null>(null);
  const step2Error = ref<string | null>(null);

  // Step 3 State
  const existingRequest = ref<CanonicalRequestSummary | null>(null);
  const isCheckingExists = ref(false);

  const seasonNumber = ref<number | null>(null);
  const downloadGranularity = ref<'season' | 'episode'>('season');
  const episodeNumber = ref<number | null>(1);
  const activeAnimeTitle = ref<string | null>(null);
  const isSubmitting = ref(false);
  const submitProgress = ref({ current: 0, total: 0 });
  const step3Error = ref<string | null>(null);

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
  const isPrivateEpisodic = ref(false);

  const activeStreamingCandidate = ref<ReleaseCandidate | null>(null);
  const isAddingToWaitlistFromModal = ref(false);
  const hasAddedToWaitlistFromModal = ref(false);

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
        rdCacheMap.value = {
          ...rdCacheMap.value,
          ...res.cached,
        };
      }
    } catch {
      // Non-blocking
    }
  }

  async function handleInstantStreamCandidate(candidate: ReleaseCandidate) {
    if (!isStreamingEnabled.value) {
      requestsStore.showToast('Streaming is currently disabled by administrators', 'error');
      return;
    }
    if (candidate.isInfringing) {
      requestsStore.showToast('This release has been blocked by Real-Debrid due to a DMCA copyright takedown', 'error');
      return;
    }
    if (candidate.isPrivateTracker || isKnownPrivateIndexer(candidate.indexer)) {
      requestsStore.showToast('Releases from private trackers cannot be streamed via cloud debrid', 'error');
      return;
    }

    activeStreamingCandidate.value = candidate;

    try {
      streamModalTitle.value = candidate.title;
      streamModalStatus.value = 'pending';
      streamModalError.value = '';
      showStreamModal.value = true;

      const res = await api.post<{ streamId: string; status: 'pending' | 'ready' }>('/streams', {
        magnetLink: candidate.downloadUrl,
        title: candidate.title,
        indexer: candidate.indexer,
        isPrivateTracker: candidate.isPrivateTracker ?? isKnownPrivateIndexer(candidate.indexer),
        infoHash: candidate.infoHash,
      });

      streamModalId.value = res.streamId;
      if (res.status === 'ready') {
        streamModalStatus.value = 'ready';
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Failed to initialize instant stream';
      await handleStreamPlaybackError({
        error: errorMsg,
        isInfringing: errorMsg.includes('451') || errorMsg.includes('infringing'),
        infoHash: candidate.infoHash,
      });
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

  function navigateToWaitlistWithMetadata() {
    if (!selectedCandidate.value) return;
    router.push({
      path: '/waitlist',
      query: {
        add: 'true',
        title: selectedCandidate.value.title,
        year: selectedCandidate.value.year ? String(selectedCandidate.value.year) : undefined,
        metadataId: selectedCandidate.value.id,
        metadataSource: selectedCandidate.value.source || 'tmdb',
        mediaType: mediaType.value,
        seasonNumber: seasonNumber.value ? String(seasonNumber.value) : undefined,
        targetEpisode: downloadGranularity.value === 'episode' && episodeNumber.value ? String(episodeNumber.value) : undefined,
        posterUrl: selectedCandidate.value.posterUrl || undefined,
      },
    });
  }

  function skipMetadata() {
    const title = customQuery.value.trim() || 'Private Video';
    const dummyCandidate: MetadataCandidate = {
      id: `custom_${Date.now()}`,
      source: 'tmdb',
      title,
      year: new Date().getFullYear(),
      posterUrl: null,
      overview: 'Private media submission without TMDB match.',
    };
    selectCandidate(dummyCandidate);
  }

  async function checkDuplicateExists(candidate: MetadataCandidate): Promise<CanonicalRequestSummary | null> {
    try {
      isCheckingExists.value = true;
      const effectiveSeason = mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : undefined;
      const effectiveEpisode = (mediaType.value !== 'movie' && downloadGranularity.value === 'episode') ? (episodeNumber.value ?? 1) : undefined;

      const params: Record<string, string | number | undefined> = {
        metadataId: candidate.id,
        metadataSource: candidate.source,
        mediaType: mediaType.value,
      };
      if (effectiveSeason !== undefined) params.seasonNumber = effectiveSeason;
      if (effectiveEpisode !== undefined) params.episodeNumber = effectiveEpisode;

      const res = await api.get<{ exists: boolean; request?: CanonicalRequestSummary }>('/requests/exists', params);
      if (res.exists && res.request) {
        existingRequest.value = res.request;
        return res.request;
      }
      existingRequest.value = null;
      return null;
    } catch (err) {
      console.error('Failed to check duplicate request:', err);
      existingRequest.value = null;
      return null;
    } finally {
      isCheckingExists.value = false;
    }
  }

  watch(isPrivateEpisodic, (val) => {
    if (mediaType.value === 'private') {
      if (val) {
        if (!seasonNumber.value) seasonNumber.value = 1;
        if (downloadGranularity.value === 'episode' && !episodeNumber.value) episodeNumber.value = 1;
      } else {
        seasonNumber.value = null;
        episodeNumber.value = null;
      }
    }
  });

  watch(mediaType, (newType) => {
    if (newType === 'movie') {
      seasonNumber.value = null;
      episodeNumber.value = null;
      downloadGranularity.value = 'season';
    } else if (newType === 'private') {
      if (isPrivateEpisodic.value) {
        if (!seasonNumber.value) seasonNumber.value = 1;
        if (downloadGranularity.value === 'episode' && !episodeNumber.value) episodeNumber.value = 1;
      } else {
        seasonNumber.value = null;
        episodeNumber.value = null;
      }
    } else {
      if (!seasonNumber.value) {
        seasonNumber.value = 1;
      }
      if (downloadGranularity.value === 'episode' && !episodeNumber.value) {
        episodeNumber.value = 1;
      }
    }
  });

  async function onGranularityChange(val: 'season' | 'episode') {
    downloadGranularity.value = val;
    if (val === 'episode' && !episodeNumber.value) {
      episodeNumber.value = 1;
    }
    if (!seasonNumber.value) {
      seasonNumber.value = 1;
    }
    if (currentStep.value === 3 && selectedCandidate.value && validBatchItems.value.length <= 1) {
      const exists = await checkDuplicateExists(selectedCandidate.value);
      if (!exists && inputMode.value === 'search') {
        await fetchReleasesForCandidate(selectedCandidate.value);
      }
    }
  }

  async function onSeasonOrEpisodeChange() {
    if (currentStep.value === 3 && selectedCandidate.value && validBatchItems.value.length <= 1) {
      const exists = await checkDuplicateExists(selectedCandidate.value);
      if (!exists && inputMode.value === 'search') {
        await fetchReleasesForCandidate(selectedCandidate.value);
      }
    }
  }

  async function setAnimeTitle(title: string) {
    if (activeAnimeTitle.value === title) return;
    activeAnimeTitle.value = title;
    if (currentStep.value === 3 && inputMode.value === 'search' && selectedCandidate.value) {
      await fetchReleasesForCandidate(selectedCandidate.value);
    }
  }

  function initFastTrackFromRoute(): boolean {
    const query = route.query;
    const state = (typeof window !== 'undefined' ? (window.history?.state || {}) : {}) as Record<
      string,
      string | number | boolean | null | undefined
    >;

    const rawTitle = (query.title || (typeof state.title === 'string' ? state.title : undefined)) as string | undefined;
    const rawMetadataId = (query.metadataId || (typeof state.metadataId === 'string' || typeof state.metadataId === 'number' ? String(state.metadataId) : undefined)) as string | undefined;
    const rawDownloadUrl = (query.downloadUrl || (typeof state.downloadUrl === 'string' ? state.downloadUrl : undefined)) as string | undefined;
    const rawMediaType = (query.mediaType || (typeof state.mediaType === 'string' ? state.mediaType : undefined)) as string | undefined;

    if (!rawTitle || !rawMetadataId || !rawDownloadUrl || !rawMediaType) {
      if (query.fastTrack === 'true' || query.downloadUrl || query.releaseTitle || query.metadataId) {
        step1Error.value = 'Incomplete fast-track parameters. Please search or upload manually.';
      }
      return false;
    }

    const validMediaTypes: MediaType[] = ['movie', 'tv_show', 'anime', 'private'];
    if (!validMediaTypes.includes(rawMediaType as MediaType)) {
      step1Error.value = 'Invalid media type for fast-track request.';
      return false;
    }

    const mediaTypeValue = rawMediaType as MediaType;
    mediaType.value = mediaTypeValue;

    const rawYear = query.year || state.year;
    const yearNum = rawYear ? parseInt(String(rawYear), 10) : null;

    selectedCandidate.value = {
      id: String(rawMetadataId),
      source: (query.metadataSource === 'anilist' || state.metadataSource === 'anilist') ? 'anilist' : 'tmdb',
      title: String(rawTitle),
      year: yearNum !== null && !isNaN(yearNum) ? yearNum : null,
      posterUrl: (query.posterUrl as string) || (typeof state.posterUrl === 'string' ? state.posterUrl : null),
      overview: (query.overview as string) || (typeof state.overview === 'string' ? state.overview : null),
      romajiTitle: (query.romajiTitle as string) || (typeof state.romajiTitle === 'string' ? state.romajiTitle : null),
      englishTitle: (query.englishTitle as string) || (typeof state.englishTitle === 'string' ? state.englishTitle : null),
    };

    if (query.seasonNumber !== undefined || state.seasonNumber !== undefined) {
      const s = parseInt(String(query.seasonNumber ?? state.seasonNumber), 10);
      if (!isNaN(s)) seasonNumber.value = s;
    } else if (mediaTypeValue !== 'movie') {
      seasonNumber.value = 1;
    }

    if (query.episodeNumber !== undefined || state.episodeNumber !== undefined) {
      const e = parseInt(String(query.episodeNumber ?? state.episodeNumber), 10);
      if (!isNaN(e)) {
        episodeNumber.value = e;
        downloadGranularity.value = 'episode';
      } else {
        downloadGranularity.value = 'season';
      }
    } else {
      downloadGranularity.value = 'season';
    }

    const rawSeeders = query.seeders ? parseInt(String(query.seeders), 10) : (typeof state.seeders === 'number' ? state.seeders : 10);
    const rawLeechers = query.leechers ? parseInt(String(query.leechers), 10) : (typeof state.leechers === 'number' ? state.leechers : 0);
    const rawSizeBytes = query.sizeBytes ? parseInt(String(query.sizeBytes), 10) : (typeof state.sizeBytes === 'number' ? state.sizeBytes : 0);
    const rawScore = query.score ? parseInt(String(query.score), 10) : (typeof state.score === 'number' ? state.score : 100);

    const rawIndexer = String(query.indexer || state.indexer || 'Indexer');
    const rawIsPrivate =
      query.isPrivateTracker === 'true' ||
      state.isPrivateTracker === true ||
      isKnownPrivateIndexer(rawIndexer);

    const candidate: ReleaseCandidate = {
      guid: String(query.guid || state.guid || `fast-track-${Date.now()}`),
      title: String(query.releaseTitle || state.releaseTitle || rawTitle),
      downloadUrl: String(rawDownloadUrl),
      indexer: rawIndexer,
      sizeBytes: isNaN(rawSizeBytes) ? 0 : rawSizeBytes,
      formattedSize: String(
        query.formattedSize ||
          state.formattedSize ||
          (rawSizeBytes > 0 ? formatBytes(rawSizeBytes) : 'Unknown')
      ),
      seeders: isNaN(rawSeeders) ? 10 : rawSeeders,
      leechers: isNaN(rawLeechers) ? 0 : rawLeechers,
      resolution: String(query.resolution || state.resolution || '1080p'),
      codec: String(query.codec || state.codec || 'unknown'),
      source: String(query.source || state.source || 'unknown'),
      score: isNaN(rawScore) ? 100 : rawScore,
      isLowHealth: !isNaN(rawSeeders) && rawSeeders < 5,
      isPrivateTracker: rawIsPrivate,
    };

    recommendedRelease.value = candidate;
    selectedRelease.value = candidate;
    releaseCandidates.value = [candidate];
    magnetLink.value = candidate.downloadUrl;
    inputMode.value = 'search';
    currentStep.value = 3;

    watchForNextEpisodes.value = query.fromUpNext === 'true' || state.fromUpNext === true;
    notifyBeforeEachDownload.value = false;

    return true;
  }

  onMounted(async () => {
    featureFlags.ensureFlagsLoaded();
    if (route.query.fromUpNext === 'true') {
      watchForNextEpisodes.value = true;
      notifyBeforeEachDownload.value = false;
    }
    const isFastTrack = initFastTrackFromRoute();

    if (isFastTrack && selectedCandidate.value) {
      await checkDuplicateExists(selectedCandidate.value);
      if (!selectedCandidate.value.posterUrl || !selectedCandidate.value.overview) {
        api.post<{ candidates: MetadataCandidate[] }>('/requests/search-metadata', {
          mediaType: mediaType.value,
          query: selectedCandidate.value.title,
        }).then((res) => {
          if (res.candidates && res.candidates.length > 0) {
            const match = res.candidates.find((c) => String(c.id) === String(selectedCandidate.value?.id)) || res.candidates[0];
            if (match && selectedCandidate.value) {
              if (!selectedCandidate.value.posterUrl && match.posterUrl) {
                selectedCandidate.value.posterUrl = match.posterUrl;
              }
              if (!selectedCandidate.value.overview && match.overview) {
                selectedCandidate.value.overview = match.overview;
              }
              if (!selectedCandidate.value.year && match.year) {
                selectedCandidate.value.year = match.year;
              }
            }
          }
        }).catch(() => {});
      }
    }

    try {
      const status = await api.get<{ isConfigured: boolean; isReachable: boolean }>('/requests/prowlarr-status');
      isProwlarrConfigured.value = status.isConfigured;
      isProwlarrReachable.value = status.isReachable;
      if (!isFastTrack && (!status.isConfigured || !status.isReachable)) {
        inputMode.value = 'magnet';
      }
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const d = err.data as { isConfigured?: boolean; isReachable?: boolean };
        isProwlarrConfigured.value = d.isConfigured ?? false;
        isProwlarrReachable.value = d.isReachable ?? false;
      } else {
        isProwlarrConfigured.value = false;
        isProwlarrReachable.value = false;
      }
      if (!isFastTrack) {
        inputMode.value = 'magnet';
      }
    }
  });

  watch(magnetLink, async (newVal) => {
    if (inputMode.value !== 'magnet') return;
    const trimmed = newVal.trim();
    if (!trimmed) return;

    const cleaned = cleanTorrentTitle(trimmed);
    if (cleaned.title) {
      customQuery.value = cleaned.title;
    }
    if (cleaned.detectedMediaType) {
      mediaType.value = cleaned.detectedMediaType;
    }
    if (cleaned.seasonNumber !== undefined) {
      seasonNumber.value = cleaned.seasonNumber;
    } else if (cleaned.detectedMediaType === 'movie') {
      seasonNumber.value = null;
    }

    if (!cleaned.title.trim()) {
      await nextTick();
      step1Ref.value?.customQueryInputRef?.focus();
    }
  });

  function applySeasonToAll() {
    if (batchSeasonInput.value === null || isNaN(batchSeasonInput.value)) return;
    const s = batchSeasonInput.value;
    seasonNumber.value = s;
    for (const item of batchItems.value) {
      if (!item.error) {
        item.seasonNumber = s;
      }
    }
  }

  function removeBatchItem(id: string) {
    batchItems.value = batchItems.value.filter((item) => item.id !== id);
    const firstValid = batchItems.value.find((b) => !b.error);
    if (firstValid) {
      selectedFile.value = firstValid.file;
      magnetLink.value = firstValid.parsed?.magnetUri || '';
      if (firstValid.seasonNumber) {
        seasonNumber.value = firstValid.seasonNumber;
        batchSeasonInput.value = firstValid.seasonNumber;
      }
      const cleaned = cleanTorrentTitle(firstValid.parsed?.name || firstValid.fileName);
      if (cleaned.title) {
        customQuery.value = cleaned.title;
      }
    } else {
      selectedFile.value = null;
      magnetLink.value = '';
      customQuery.value = '';
      candidates.value = [];
      selectedCandidate.value = null;
      seasonNumber.value = null;
      batchSeasonInput.value = 1;
    }
  }

  function clearAllBatchItems() {
    batchItems.value = [];
    selectedFile.value = null;
    magnetLink.value = '';
    customQuery.value = '';
    candidates.value = [];
    selectedCandidate.value = null;
    seasonNumber.value = null;
    batchSeasonInput.value = 1;
  }

  async function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    step1Error.value = null;

    for (const file of fileArray) {
      const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`;

      if (!file.name.toLowerCase().endsWith('.torrent')) {
        batchItems.value.push({
          id,
          file,
          fileName: file.name,
          fileSizeBytes: file.size,
          error: 'Invalid file type: must be a .torrent file',
        });
        continue;
      }

      try {
        const parsed = await parseTorrentFile(file);
        const episodeInfo = extractEpisodeInfo(file.name);
        const cleaned = cleanTorrentTitle(parsed.name || file.name);

        const detectedSeason = episodeInfo.seasonNumber ?? cleaned.seasonNumber ?? (seasonNumber.value || 1);
        const detectedEp = episodeInfo.episodeNumber;

        const item: BatchItem = {
          id,
          file,
          fileName: file.name,
          fileSizeBytes: parsed.totalSize || file.size,
          parsed,
          seasonNumber: detectedSeason,
          episodeNumber: detectedEp,
        };

        batchItems.value.push(item);

        if (cleaned.detectedMediaType) {
          mediaType.value = cleaned.detectedMediaType;
        } else if (detectedEp !== undefined || batchItems.value.filter((b) => !b.error).length > 1) {
          if (mediaType.value === 'movie') {
            mediaType.value = 'tv_show';
          }
        }
      } catch (err) {
        batchItems.value.push({
          id,
          file,
          fileName: file.name,
          fileSizeBytes: file.size,
          error: 'Corrupt or unreadable .torrent: ' + ((err as Error).message || 'Invalid format'),
        });
      }
    }

    const firstValid = batchItems.value.find((b) => !b.error);
    if (firstValid) {
      selectedFile.value = firstValid.file;
      magnetLink.value = firstValid.parsed?.magnetUri || '';
      if (firstValid.seasonNumber) {
        seasonNumber.value = firstValid.seasonNumber;
        batchSeasonInput.value = firstValid.seasonNumber;
      }
      const cleaned = cleanTorrentTitle(firstValid.parsed?.name || firstValid.fileName);
      if (cleaned.title) {
        customQuery.value = cleaned.title;
      }
    }

    if (!customQuery.value.trim()) {
      await nextTick();
      step1Ref.value?.customQueryInputRef?.focus();
    }
  }

  async function handleSearchMetadata() {
    if (!customQuery.value.trim()) {
      if (currentStep.value === 2) {
        step2Error.value = 'Media Title / Search Query is required.';
        step2Ref.value?.step2QueryInputRef?.focus();
      } else {
        step1Error.value = 'Media Title / Search Query is required.';
        step1Ref.value?.customQueryInputRef?.focus();
      }
      return;
    }

    if (inputMode.value === 'magnet' && !magnetLink.value.trim()) return;
    if (inputMode.value === 'file' && validBatchItems.value.length === 0) return;

    isSearching.value = true;
    step1Error.value = null;
    step2Error.value = null;

    try {
      const payload: Record<string, unknown> = {
        mediaType: mediaType.value,
        query: customQuery.value.trim(),
      };

      if (inputMode.value === 'file') {
        const firstValid = validBatchItems.value[0];
        if (firstValid) {
          const base64 = await fileToBase64(firstValid.file);
          payload.torrentFileBase64 = base64;
          payload.magnetLink = firstValid.parsed?.magnetUri || undefined;
        }
      } else if (inputMode.value === 'magnet') {
        payload.magnetLink = magnetLink.value.trim();
      }

      const data = await api.post<{ candidates: MetadataCandidate[] }>('/requests/search-metadata', payload);

      candidates.value = data.candidates || [];
      selectedCandidate.value = candidates.value.length > 0 ? candidates.value[0] : null;
      currentStep.value = 2;
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to search metadata. Please check the input.';
      if (currentStep.value === 2) {
        step2Error.value = msg;
      } else {
        step1Error.value = msg;
      }
    } finally {
      isSearching.value = false;
    }
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

    const effectiveEpisode = downloadGranularity.value === 'episode' ? (episodeNumber.value ?? 1) : null;
    const effectiveSeason = mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : null;

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

    try {
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

      const mappedCandidates = (data.candidates || []).map((c) => ({
        ...c,
        isPrivateTracker: c.isPrivateTracker ?? isKnownPrivateIndexer(c.indexer),
      }));
      const mappedRecommended = data.recommended
        ? {
            ...data.recommended,
            isPrivateTracker: data.recommended.isPrivateTracker ?? isKnownPrivateIndexer(data.recommended.indexer),
          }
        : null;

      isProwlarrConfigured.value = data.isConfigured;
      isProwlarrReachable.value = data.isReachable ?? true;
      hasHealthyReleases.value = data.hasHealthyReleases ?? mappedCandidates.some((c) => !c.isLowHealth);
      recommendedRelease.value = mappedRecommended;
      releaseCandidates.value = mappedCandidates;
      selectedRelease.value = mappedRecommended;

      if (releaseCandidates.value.length > 0) {
        checkCacheForCandidates(releaseCandidates.value);
      }

      if (selectedRelease.value) {
        magnetLink.value = selectedRelease.value.downloadUrl;
      }
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const d = err.data as { isConfigured?: boolean; isReachable?: boolean };
        isProwlarrConfigured.value = d.isConfigured ?? false;
        isProwlarrReachable.value = d.isReachable ?? false;
        hasHealthyReleases.value = false;
      } else {
        hasHealthyReleases.value = false;
      }
    } finally {
      isSearchingReleases.value = false;
    }
  }

  async function reloadReleasesSilently() {
    if (!selectedCandidate.value) return;

    const candidate = selectedCandidate.value;
    const effectiveEpisode = downloadGranularity.value === 'episode' ? (episodeNumber.value ?? 1) : null;
    const effectiveSeason = mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : null;

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

    try {
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

      const mappedCandidates = (data.candidates || []).map((c) => ({
        ...c,
        isPrivateTracker: c.isPrivateTracker ?? isKnownPrivateIndexer(c.indexer),
      }));
      const mappedRecommended = data.recommended
        ? {
            ...data.recommended,
            isPrivateTracker: data.recommended.isPrivateTracker ?? isKnownPrivateIndexer(data.recommended.indexer),
          }
        : null;

      isProwlarrConfigured.value = data.isConfigured;
      isProwlarrReachable.value = data.isReachable ?? true;
      hasHealthyReleases.value = data.hasHealthyReleases ?? mappedCandidates.some((c) => !c.isLowHealth);

      releaseCandidates.value = mappedCandidates;
      recommendedRelease.value = mappedRecommended;

      if (
        selectedRelease.value &&
        (selectedRelease.value.isInfringing ||
          mappedCandidates.find((c) => c.guid === selectedRelease.value?.guid)?.isInfringing)
      ) {
        selectedRelease.value = mappedRecommended;
        if (mappedRecommended) {
          magnetLink.value = mappedRecommended.downloadUrl;
        }
      }

      if (releaseCandidates.value.length > 0) {
        checkCacheForCandidates(releaseCandidates.value);
      }
    } catch (err) {
      console.error('Silent release reload failed:', err);
    }
  }

  async function handleStreamPlaybackError(payload: {
    streamId?: string;
    error: string;
    isInfringing?: boolean;
    infoHash?: string;
  }) {
    streamModalStatus.value = 'error';
    streamModalError.value = payload.error;
    hasAddedToWaitlistFromModal.value = false;

    const candidate = activeStreamingCandidate.value;
    const isInfringing =
      Boolean(payload.isInfringing) ||
      payload.error.includes('451') ||
      payload.error.includes('infringing') ||
      payload.error.includes('copyright takedown');

    const failedHash =
      payload.infoHash ||
      (candidate ? (candidate.infoHash || extractInfoHash(candidate.downloadUrl)) : '');

    if (isInfringing && failedHash) {
      try {
        await api.post('/requests/mark-infringing', { infoHash: failedHash });
      } catch {
        // Non-blocking
      }
      const localMatch = releaseCandidates.value.find(
        (c) => (c.infoHash || extractInfoHash(c.downloadUrl)).toLowerCase() === failedHash.toLowerCase()
      );
      if (localMatch) {
        localMatch.isInfringing = true;
      }
    }

    await reloadReleasesSilently();
  }

  async function handleConfirmAddToWaitlist() {
    if (!selectedCandidate.value) return;
    const title = selectedCandidate.value.title;
    isAddingToWaitlistFromModal.value = true;
    try {
      await api.post('/waitlist', {
        mediaType: mediaType.value,
        metadataId: selectedCandidate.value.id,
        metadataSource: selectedCandidate.value.source || 'tmdb',
        title: title,
        year: selectedCandidate.value.year,
        posterUrl: selectedCandidate.value.posterUrl,
        seasonNumber: mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : null,
        targetEpisode:
          downloadGranularity.value === 'episode' && episodeNumber.value
            ? episodeNumber.value
            : (mediaType.value === 'movie' ? null : 1),
      });
      hasAddedToWaitlistFromModal.value = true;
      requestsStore.showToast(`Added "${title}" to your waitlist!`, 'success');
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string } | null;
      if (error?.status === 409 || error?.message?.includes('already')) {
        hasAddedToWaitlistFromModal.value = true;
        requestsStore.showToast(`"${title}" is already in your library or waitlist.`, 'info');
      } else {
        requestsStore.showToast(`Failed to add to waitlist: ${error?.message || 'Unknown error'}`, 'error');
      }
    } finally {
      isAddingToWaitlistFromModal.value = false;
    }
  }

  async function selectCandidate(candidate: MetadataCandidate) {
    selectedCandidate.value = candidate;
    if (mediaType.value === 'anime') {
      if (candidate.romajiTitle && !hasCjk(candidate.romajiTitle)) {
        activeAnimeTitle.value = candidate.romajiTitle;
      } else if (candidate.englishTitle && !hasCjk(candidate.englishTitle)) {
        activeAnimeTitle.value = candidate.englishTitle;
      } else if (!hasCjk(candidate.title)) {
        activeAnimeTitle.value = candidate.title;
      } else {
        activeAnimeTitle.value = candidate.romajiTitle || candidate.title;
      }
    } else {
      activeAnimeTitle.value = candidate.title;
    }
    waitlistNextSeason.value = false;
    watchForNextEpisodes.value = route.query.fromUpNext === 'true';
    notifyBeforeEachDownload.value = false;
    currentStep.value = 3;
    if (validBatchItems.value.length <= 1) {
      const exists = await checkDuplicateExists(candidate);
      if (exists) {
        return;
      }
    }
    if (inputMode.value === 'search') {
      await fetchReleasesForCandidate(candidate);
    }
  }

  async function confirmStep2Selection() {
    if (!selectedCandidate.value) return;
    await selectCandidate(selectedCandidate.value);
  }

  async function handleConfirmRequest() {
    if (!isManualTorrentsEnabled.value) return;
    if (!selectedCandidate.value) return;

    isSubmitting.value = true;
    step3Error.value = null;

    try {
      if (inputMode.value === 'file' && validBatchItems.value.length > 1) {
        submitProgress.value = { current: 0, total: validBatchItems.value.length };

        const itemsPayload = [];
        for (let i = 0; i < validBatchItems.value.length; i++) {
          const item = validBatchItems.value[i];
          submitProgress.value.current = i + 1;
          const base64 = await fileToBase64(item.file);
          itemsPayload.push({
            torrentFileBase64: base64,
            torrentFileName: item.fileName,
            magnetLink: item.parsed?.magnetUri || undefined,
            seasonNumber: item.seasonNumber ?? seasonNumber.value ?? undefined,
            episodeNumber: item.episodeNumber ?? undefined,
          });
        }

        const batchPayload = {
          mediaType: mediaType.value,
          metadataId: selectedCandidate.value.id,
          metadataSource: selectedCandidate.value.source,
          title: selectedCandidate.value.title,
          year: selectedCandidate.value.year ?? undefined,
          seasonNumber: seasonNumber.value ?? undefined,
          items: itemsPayload,
        };

        const res = await api.post<{ requests: DownloadRequest[]; count: number }>('/requests/batch', batchPayload);

        const queuedCount = res.requests.filter((r) => r.status === 'queued').length;
        const downloadingCount = res.requests.filter((r) => r.status === 'downloading').length;

        if (downloadingCount > 0 && queuedCount > 0) {
          requestsStore.showToast(
            `Batch submitted: ${downloadingCount} downloading, ${queuedCount} queued`,
            'success'
          );
        } else if (queuedCount > 0) {
          requestsStore.showToast(
            `Batch submitted: ${queuedCount} request(s) queued`,
            'info'
          );
        } else {
          requestsStore.showToast(
            `Batch submitted: ${res.count} download(s) started`,
            'success'
          );
        }

        router.push('/dashboard');
      } else {
        submitProgress.value = { current: 0, total: 1 };
        const singleItem = validBatchItems.value[0];
        const effectiveSeason = singleItem?.seasonNumber ?? (mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : undefined);
        const effectiveEpisode = singleItem?.episodeNumber ?? (downloadGranularity.value === 'episode' ? (episodeNumber.value ?? 1) : undefined);

        const payload: Record<string, unknown> = {
          mediaType: mediaType.value,
          metadataId: selectedCandidate.value.id,
          metadataSource: selectedCandidate.value.source,
          title: selectedCandidate.value.title,
          year: selectedCandidate.value.year ?? undefined,
          seasonNumber: effectiveSeason ?? undefined,
          episodeNumber: effectiveEpisode ?? undefined,
        };

        if (
          waitlistNextSeason.value &&
          ['tv_show', 'anime'].includes(mediaType.value) &&
          downloadGranularity.value === 'season'
        ) {
          payload.waitlistNextSeason = true;
        }

        if (existingRequest.value) {
          if (magnetLink.value && magnetLink.value.trim()) {
            payload.magnetLink = magnetLink.value.trim();
          }
        } else if (inputMode.value === 'file') {
          const fileToUpload = singleItem?.file || selectedFile.value;
          if (!fileToUpload) throw new Error('No torrent file selected');
          const base64 = await fileToBase64(fileToUpload);
          payload.torrentFileBase64 = base64;
          payload.torrentFileName = fileToUpload.name;
          payload.magnetLink = singleItem?.parsed?.magnetUri || magnetLink.value || undefined;
        } else if (inputMode.value === 'search') {
          if (isManualFallbackInStep3.value) {
            if (manualFallbackMode.value === 'file') {
              if (!fallbackFile.value) throw new Error('No torrent file selected');
              const base64 = await fileToBase64(fallbackFile.value);
              payload.torrentFileBase64 = base64;
              payload.torrentFileName = fallbackFile.value.name;
            } else {
              const link = fallbackMagnetLink.value.trim();
              if (!link) throw new Error('No magnet link provided');
              payload.magnetLink = link;
            }
          } else {
            const link = selectedRelease.value?.downloadUrl || recommendedRelease.value?.downloadUrl || magnetLink.value.trim();
            if (!link) throw new Error('No torrent release selected');
            payload.magnetLink = link;
          }
        } else {
          payload.magnetLink = magnetLink.value.trim();
        }

        const res = await api.post<{ request: DownloadRequest }>('/requests', payload);

        if (
          watchForNextEpisodes.value &&
          ['tv_show', 'anime'].includes(mediaType.value) &&
          downloadGranularity.value === 'episode'
        ) {
          try {
            const currentEp = effectiveEpisode ?? 1;
            await api.post('/waitlist', {
              mediaType: mediaType.value,
              metadataId: selectedCandidate.value.id,
              metadataSource: selectedCandidate.value.source,
              title: selectedCandidate.value.title,
              year: selectedCandidate.value.year ?? undefined,
              seasonNumber: effectiveSeason ?? 1,
              targetEpisode: currentEp + 1,
              notifyBeforeDownload: notifyBeforeEachDownload.value,
            });
          } catch {
            requestsStore.showToast(
              'Download started, but failed to watch for next episodes in Waitlist.',
              'error'
            );
          }
        }

        if (existingRequest.value) {
          requestsStore.showToast(
            `Added to your dashboard: ${res.request.title}`,
            'success'
          );
        } else if (res.request.status === 'queued') {
          if (res.request.deferredReason === 'waiting_for_space') {
            requestsStore.showToast(
              'Your request has been queued and will start automatically once storage space is available',
              'info'
            );
          } else {
            requestsStore.showToast(
              'Your request has been queued and will start when a download slot is available',
              'info'
            );
          }
        } else {
          requestsStore.showToast(
            `Download started: ${res.request.title}`,
            'success'
          );
        }

        router.push('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 422) {
          step3Error.value =
            'Not enough disk space — please ask an admin to free up space.';
        } else {
          step3Error.value = err.message;
        }
      } else {
        step3Error.value = ((err as Error).message) || 'Failed to submit download request.';
      }
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    isManualTorrentsEnabled,
    isStreamingEnabled,
    currentStep,
    waitlistNextSeason,
    watchForNextEpisodes,
    notifyBeforeEachDownload,
    inputMode,
    magnetLink,
    isSearchingReleases,
    recommendedRelease,
    selectedRelease,
    releaseCandidates,
    isExplorerExpanded,
    candidateSortBy,
    sortOptions,
    rdCacheMap,
    showStreamModal,
    streamModalId,
    streamModalTitle,
    streamModalStatus,
    streamModalError,
    selectedFile,
    batchItems,
    batchSeasonInput,
    validBatchItems,
    invalidBatchItems,
    totalBatchSize,
    mediaType,
    customQuery,
    isSearching,
    step1Error,
    step1Ref,
    step2Ref,
    mediaTypeOptions,
    candidates,
    selectedCandidate,
    step2Error,
    existingRequest,
    isCheckingExists,
    seasonNumber,
    downloadGranularity,
    episodeNumber,
    activeAnimeTitle,
    isSubmitting,
    submitProgress,
    step3Error,
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
    isPrivateEpisodic,
    activeStreamingCandidate,
    isAddingToWaitlistFromModal,
    hasAddedToWaitlistFromModal,
    extractInfoHash,
    getCandidateCacheStatus,
    checkCacheForCandidates,
    handleInstantStreamCandidate,
    selectRelease,
    resetToRecommendedRelease,
    handleFallbackFileChange,
    switchToManualUpload,
    navigateToWaitlistWithMetadata,
    skipMetadata,
    checkDuplicateExists,
    onGranularityChange,
    onSeasonOrEpisodeChange,
    setAnimeTitle,
    initFastTrackFromRoute,
    applySeasonToAll,
    removeBatchItem,
    clearAllBatchItems,
    processFiles,
    handleSearchMetadata,
    fetchReleasesForCandidate,
    reloadReleasesSilently,
    handleStreamPlaybackError,
    handleConfirmAddToWaitlist,
    selectCandidate,
    confirmStep2Selection,
    handleConfirmRequest,
    hasCjk,
  };
}
