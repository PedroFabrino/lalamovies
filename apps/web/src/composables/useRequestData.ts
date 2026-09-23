import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api, ApiError } from '../lib/api';
import { type MediaType } from '../stores/requests';
import { useFeatureFlags } from './useFeatureFlags';
import type { ReleaseCandidate } from '../lib/releaseExplorer';

import type { MetadataCandidate, BatchItem, CanonicalRequestSummary } from './requestTypes';
import { parseFastTrack } from './requestFastTrack';
import { useRequestStep1 } from './useRequestStep1';
import { useRequestStep2 } from './useRequestStep2';
import { useRequestReleases } from './useRequestReleases';
import { useStreamModal } from './useStreamModal';
import { useRequestSubmit } from './useRequestSubmit';

export type { MetadataCandidate, ReleaseCandidate, BatchItem, CanonicalRequestSummary };

export function useRequestData() {
  const route = useRoute();
  const featureFlags = useFeatureFlags();

  const isManualTorrentsEnabled = computed(() => featureFlags.isEnabled('manual_torrents'));
  const isStreamingEnabled = computed(() => featureFlags.isEnabled('streaming'));

  const currentStep = ref<1 | 2 | 3>(1);
  const mediaType = ref<MediaType>('movie');
  const seasonNumber = ref<number | null>(null);
  const downloadGranularity = ref<'season' | 'episode'>('season');
  const episodeNumber = ref<number | null>(1);

  const step1 = useRequestStep1({
    mediaType,
    seasonNumber,
    onResetCandidates: () => {
      step2.candidates.value = [];
      step2.selectedCandidate.value = null;
    },
  });

  const step2 = useRequestStep2({
    currentStep,
    mediaType,
    customQuery: step1.customQuery,
    inputMode: step1.inputMode,
    magnetLink: step1.magnetLink,
    validBatchItems: step1.validBatchItems,
    step1Error: step1.step1Error,
    step1Ref: step1.step1Ref,
    isSearching: step1.isSearching,
    onCandidateSelected: async (candidate) => {
      submit.waitlistNextSeason.value = false;
      submit.watchForNextEpisodes.value = route.query.fromUpNext === 'true';
      submit.notifyBeforeEachDownload.value = false;
      if (step1.validBatchItems.value.length <= 1) {
        const exists = await submit.checkDuplicateExists(candidate);
        if (exists) return;
      }
      if (step1.inputMode.value === 'search') {
        await releases.fetchReleasesForCandidate(candidate);
      }
    },
    onAnimeTitleChanged: async () => {
      if (currentStep.value === 3 && step1.inputMode.value === 'search' && step2.selectedCandidate.value) {
        await releases.fetchReleasesForCandidate(step2.selectedCandidate.value);
      }
    },
  });

  const releases = useRequestReleases({
    mediaType,
    seasonNumber,
    downloadGranularity,
    episodeNumber,
    activeAnimeTitle: step2.activeAnimeTitle,
    selectedCandidate: step2.selectedCandidate,
    magnetLink: step1.magnetLink,
    isStreamingEnabled,
  });

  const streamModal = useStreamModal({
    isStreamingEnabled,
    mediaType,
    selectedCandidate: step2.selectedCandidate,
    seasonNumber,
    downloadGranularity,
    episodeNumber,
    onStreamPlaybackError: async ({ isInfringing, infoHash }) => {
      if (isInfringing && infoHash) {
        try {
          await api.post('/requests/mark-infringing', { infoHash });
        } catch {
          // Non-blocking
        }
        const localMatch = releases.releaseCandidates.value.find(
          (c) => (c.infoHash || releases.extractInfoHash(c.downloadUrl)).toLowerCase() === infoHash.toLowerCase()
        );
        if (localMatch) localMatch.isInfringing = true;
      }
      await releases.reloadReleasesSilently();
    },
  });

  const submit = useRequestSubmit({
    mediaType,
    seasonNumber,
    downloadGranularity,
    episodeNumber,
    selectedCandidate: step2.selectedCandidate,
    inputMode: step1.inputMode,
    magnetLink: step1.magnetLink,
    selectedFile: step1.selectedFile,
    validBatchItems: step1.validBatchItems,
    selectedRelease: releases.selectedRelease,
    recommendedRelease: releases.recommendedRelease,
    isManualFallbackInStep3: releases.isManualFallbackInStep3,
    manualFallbackMode: releases.manualFallbackMode,
    fallbackMagnetLink: releases.fallbackMagnetLink,
    fallbackFile: releases.fallbackFile,
    isManualTorrentsEnabled,
    currentStep,
    onFetchReleasesForCandidate: async (candidate) => {
      await releases.fetchReleasesForCandidate(candidate);
    },
  });

  watch(step1.isPrivateEpisodic, (val) => {
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
      if (step1.isPrivateEpisodic.value) {
        if (!seasonNumber.value) seasonNumber.value = 1;
        if (downloadGranularity.value === 'episode' && !episodeNumber.value) episodeNumber.value = 1;
      } else {
        seasonNumber.value = null;
        episodeNumber.value = null;
      }
    } else {
      if (!seasonNumber.value) seasonNumber.value = 1;
      if (downloadGranularity.value === 'episode' && !episodeNumber.value) episodeNumber.value = 1;
    }
  });

  function initFastTrackFromRoute(): boolean {
    const state = (typeof window !== 'undefined' ? (window.history?.state || {}) : {}) as Record<string, unknown>;
    const { data, error } = parseFastTrack(route.query, state);

    if (error) {
      step1.step1Error.value = error;
      return false;
    }
    if (!data) return false;

    mediaType.value = data.mediaType;
    step2.selectedCandidate.value = data.candidate;
    seasonNumber.value = data.seasonNumber;
    episodeNumber.value = data.episodeNumber;
    downloadGranularity.value = data.downloadGranularity;

    releases.recommendedRelease.value = data.release;
    releases.selectedRelease.value = data.release;
    releases.releaseCandidates.value = [data.release];
    step1.magnetLink.value = data.release.downloadUrl;
    step1.inputMode.value = 'search';
    currentStep.value = 3;

    submit.watchForNextEpisodes.value = data.watchForNextEpisodes;
    submit.notifyBeforeEachDownload.value = false;

    return true;
  }

  onMounted(async () => {
    featureFlags.ensureFlagsLoaded();
    if (route.query.fromUpNext === 'true') {
      submit.watchForNextEpisodes.value = true;
      submit.notifyBeforeEachDownload.value = false;
    }
    const isFastTrack = initFastTrackFromRoute();

    if (isFastTrack && step2.selectedCandidate.value) {
      await submit.checkDuplicateExists(step2.selectedCandidate.value);
      if (!step2.selectedCandidate.value.posterUrl || !step2.selectedCandidate.value.overview) {
        api.post<{ candidates: MetadataCandidate[] }>('/requests/search-metadata', {
          mediaType: mediaType.value,
          query: step2.selectedCandidate.value.title,
        }).then((res) => {
          if (res.candidates && res.candidates.length > 0) {
            const match = res.candidates.find((c) => String(c.id) === String(step2.selectedCandidate.value?.id)) || res.candidates[0];
            if (match && step2.selectedCandidate.value) {
              if (!step2.selectedCandidate.value.posterUrl && match.posterUrl) step2.selectedCandidate.value.posterUrl = match.posterUrl;
              if (!step2.selectedCandidate.value.overview && match.overview) step2.selectedCandidate.value.overview = match.overview;
              if (!step2.selectedCandidate.value.year && match.year) step2.selectedCandidate.value.year = match.year;
            }
          }
        }).catch(() => {});
      }
    } else if (!isFastTrack && route.query.query) {
      step1.customQuery.value = String(route.query.query);
      if (route.query.mediaType && ['movie', 'tv_show', 'anime', 'private'].includes(String(route.query.mediaType))) {
        mediaType.value = route.query.mediaType as MediaType;
      }
      step1.inputMode.value = 'search';
      step2.handleSearchMetadata();
    }

    try {
      const status = await api.get<{ isConfigured: boolean; isReachable: boolean }>('/requests/prowlarr-status');
      releases.isProwlarrConfigured.value = status.isConfigured;
      releases.isProwlarrReachable.value = status.isReachable;
      if (!isFastTrack && (!status.isConfigured || !status.isReachable)) {
        step1.inputMode.value = 'magnet';
      }
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === 'object') {
        const d = err.data as { isConfigured?: boolean; isReachable?: boolean };
        releases.isProwlarrConfigured.value = d.isConfigured ?? false;
        releases.isProwlarrReachable.value = d.isReachable ?? false;
      } else {
        releases.isProwlarrConfigured.value = false;
        releases.isProwlarrReachable.value = false;
      }
      if (!isFastTrack) {
        step1.inputMode.value = 'magnet';
      }
    }
  });

  return {
    isManualTorrentsEnabled,
    isStreamingEnabled,
    currentStep,
    mediaType,
    seasonNumber,
    downloadGranularity,
    episodeNumber,
    ...step1,
    ...step2,
    ...releases,
    ...streamModal,
    ...submit,
  };
}
