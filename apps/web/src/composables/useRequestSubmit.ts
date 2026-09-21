import { ref, type Ref, type ComputedRef } from 'vue';
import { useRouter } from 'vue-router';
import { api, ApiError } from '../lib/api';
import { useRequestsStore, type MediaType, type DownloadRequest } from '../stores/requests';
import { fileToBase64 } from '../lib/torrentParser';
import type { MetadataCandidate, BatchItem, CanonicalRequestSummary, ReleaseCandidate } from './requestTypes';

export interface UseRequestSubmitOptions {
  mediaType: Ref<MediaType>;
  seasonNumber: Ref<number | null>;
  downloadGranularity: Ref<'season' | 'episode'>;
  episodeNumber: Ref<number | null>;
  selectedCandidate: Ref<MetadataCandidate | null>;
  inputMode: Ref<'search' | 'magnet' | 'file'>;
  magnetLink: Ref<string>;
  selectedFile: Ref<File | null>;
  validBatchItems: ComputedRef<BatchItem[]>;
  selectedRelease: Ref<ReleaseCandidate | null>;
  recommendedRelease: Ref<ReleaseCandidate | null>;
  isManualFallbackInStep3: Ref<boolean>;
  manualFallbackMode: Ref<'magnet' | 'file'>;
  fallbackMagnetLink: Ref<string>;
  fallbackFile: Ref<File | null>;
  isManualTorrentsEnabled: ComputedRef<boolean>;
  currentStep: Ref<1 | 2 | 3>;
  onFetchReleasesForCandidate?: (candidate: MetadataCandidate) => Promise<void> | void;
}

export function useRequestSubmit(options: UseRequestSubmitOptions) {
  const {
    mediaType,
    seasonNumber,
    downloadGranularity,
    episodeNumber,
    selectedCandidate,
    inputMode,
    magnetLink,
    selectedFile,
    validBatchItems,
    selectedRelease,
    recommendedRelease,
    isManualFallbackInStep3,
    manualFallbackMode,
    fallbackMagnetLink,
    fallbackFile,
    isManualTorrentsEnabled,
    currentStep,
    onFetchReleasesForCandidate,
  } = options;

  const router = useRouter();
  const requestsStore = useRequestsStore();

  const isSubmitting = ref(false);
  const submitProgress = ref({ current: 0, total: 0 });
  const step3Error = ref<string | null>(null);
  const existingRequest = ref<CanonicalRequestSummary | null>(null);
  const isCheckingExists = ref(false);

  const waitlistNextSeason = ref(false);
  const watchForNextEpisodes = ref(false);
  const notifyBeforeEachDownload = ref(false);

  async function checkDuplicateExists(candidate: MetadataCandidate): Promise<CanonicalRequestSummary | null> {
    try {
      isCheckingExists.value = true;
      const effectiveSeason = mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : undefined;
      const effectiveEpisode = (mediaType.value !== 'movie' && downloadGranularity.value === 'episode') ? (episodeNumber.value ?? 1) : undefined;
      const params: Record<string, string | number | undefined> = {
        metadataId: candidate.id,
        metadataSource: candidate.source,
        mediaType: mediaType.value,
        ...(effectiveSeason !== undefined ? { seasonNumber: effectiveSeason } : {}),
        ...(effectiveEpisode !== undefined ? { episodeNumber: effectiveEpisode } : {}),
      };
      const res = await api.get<{ exists: boolean; request?: CanonicalRequestSummary }>('/requests/exists', params);
      existingRequest.value = (res.exists && res.request) ? res.request : null;
      return existingRequest.value;
    } catch (err) {
      console.error('Failed to check duplicate request:', err);
      existingRequest.value = null;
      return null;
    } finally {
      isCheckingExists.value = false;
    }
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

  async function onGranularityChange(val: 'season' | 'episode') {
    downloadGranularity.value = val;
    if (val === 'episode' && !episodeNumber.value) episodeNumber.value = 1;
    if (!seasonNumber.value) seasonNumber.value = 1;
    if (currentStep.value === 3 && selectedCandidate.value && validBatchItems.value.length <= 1) {
      const exists = await checkDuplicateExists(selectedCandidate.value);
      if (!exists && inputMode.value === 'search' && onFetchReleasesForCandidate) {
        await onFetchReleasesForCandidate(selectedCandidate.value);
      }
    }
  }

  async function onSeasonOrEpisodeChange() {
    if (currentStep.value === 3 && selectedCandidate.value && validBatchItems.value.length <= 1) {
      const exists = await checkDuplicateExists(selectedCandidate.value);
      if (!exists && inputMode.value === 'search' && onFetchReleasesForCandidate) {
        await onFetchReleasesForCandidate(selectedCandidate.value);
      }
    }
  }

  async function submitBatchRequest() {
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
      metadataId: selectedCandidate.value!.id,
      metadataSource: selectedCandidate.value!.source,
      title: selectedCandidate.value!.title,
      year: selectedCandidate.value!.year ?? undefined,
      seasonNumber: seasonNumber.value ?? undefined,
      items: itemsPayload,
    };

    const res = await api.post<{ requests: DownloadRequest[]; count: number }>('/requests/batch', batchPayload);
    const queuedCount = res.requests.filter((r) => r.status === 'queued').length;
    const downloadingCount = res.requests.filter((r) => r.status === 'downloading').length;

    if (downloadingCount > 0 && queuedCount > 0) {
      requestsStore.showToast(`Batch submitted: ${downloadingCount} downloading, ${queuedCount} queued`, 'success');
    } else if (queuedCount > 0) {
      requestsStore.showToast(`Batch submitted: ${queuedCount} request(s) queued`, 'info');
    } else {
      requestsStore.showToast(`Batch submitted: ${res.count} download(s) started`, 'success');
    }
    router.push('/dashboard');
  }

  async function buildSinglePayload(singleItem?: BatchItem) {
    const effectiveSeason = singleItem?.seasonNumber ?? (mediaType.value !== 'movie' ? (seasonNumber.value ?? 1) : undefined);
    const effectiveEpisode = singleItem?.episodeNumber ?? (downloadGranularity.value === 'episode' ? (episodeNumber.value ?? 1) : undefined);

    const payload: Record<string, unknown> = {
      mediaType: mediaType.value,
      metadataId: selectedCandidate.value!.id,
      metadataSource: selectedCandidate.value!.source,
      title: selectedCandidate.value!.title,
      year: selectedCandidate.value!.year ?? undefined,
      seasonNumber: effectiveSeason ?? undefined,
      episodeNumber: effectiveEpisode ?? undefined,
    };

    if (waitlistNextSeason.value && ['tv_show', 'anime'].includes(mediaType.value) && downloadGranularity.value === 'season') {
      payload.waitlistNextSeason = true;
    }

    if (existingRequest.value) {
      if (magnetLink.value && magnetLink.value.trim()) payload.magnetLink = magnetLink.value.trim();
    } else if (inputMode.value === 'file') {
      const fileToUpload = singleItem?.file || selectedFile.value;
      if (!fileToUpload) throw new Error('No torrent file selected');
      payload.torrentFileBase64 = await fileToBase64(fileToUpload);
      payload.torrentFileName = fileToUpload.name;
      payload.magnetLink = singleItem?.parsed?.magnetUri || magnetLink.value || undefined;
    } else if (inputMode.value === 'search') {
      if (isManualFallbackInStep3.value) {
        if (manualFallbackMode.value === 'file') {
          if (!fallbackFile.value) throw new Error('No torrent file selected');
          payload.torrentFileBase64 = await fileToBase64(fallbackFile.value);
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
    return { payload, effectiveSeason, effectiveEpisode };
  }

  async function submitSingleRequest() {
    submitProgress.value = { current: 0, total: 1 };
    const singleItem = validBatchItems.value[0];
    const { payload, effectiveSeason, effectiveEpisode } = await buildSinglePayload(singleItem);

    const res = await api.post<{ request: DownloadRequest }>('/requests', payload);

    if (watchForNextEpisodes.value && ['tv_show', 'anime'].includes(mediaType.value) && downloadGranularity.value === 'episode') {
      try {
        const currentEp = effectiveEpisode ?? 1;
        await api.post('/waitlist', {
          mediaType: mediaType.value,
          metadataId: selectedCandidate.value!.id,
          metadataSource: selectedCandidate.value!.source,
          title: selectedCandidate.value!.title,
          year: selectedCandidate.value!.year ?? undefined,
          seasonNumber: effectiveSeason ?? 1,
          targetEpisode: currentEp + 1,
          notifyBeforeDownload: notifyBeforeEachDownload.value,
        });
      } catch {
        requestsStore.showToast('Download started, but failed to watch for next episodes in Waitlist.', 'error');
      }
    }

    if (existingRequest.value) {
      requestsStore.showToast(`Added to your dashboard: ${res.request.title}`, 'success');
    } else if (res.request.status === 'queued') {
      const msg = res.request.deferredReason === 'waiting_for_space'
        ? 'Your request has been queued and will start automatically once storage space is available'
        : 'Your request has been queued and will start when a download slot is available';
      requestsStore.showToast(msg, 'info');
    } else {
      requestsStore.showToast(`Download started: ${res.request.title}`, 'success');
    }
    router.push('/dashboard');
  }

  async function handleConfirmRequest() {
    if (!isManualTorrentsEnabled.value) return;
    if (!selectedCandidate.value) return;

    isSubmitting.value = true;
    step3Error.value = null;

    try {
      if (inputMode.value === 'file' && validBatchItems.value.length > 1) {
        await submitBatchRequest();
      } else {
        await submitSingleRequest();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        step3Error.value = err.statusCode === 422
          ? 'Not enough disk space — please ask an admin to free up space.'
          : err.message;
      } else {
        step3Error.value = (err as Error).message || 'Failed to submit download request.';
      }
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    isSubmitting,
    submitProgress,
    step3Error,
    existingRequest,
    isCheckingExists,
    waitlistNextSeason,
    watchForNextEpisodes,
    notifyBeforeEachDownload,
    checkDuplicateExists,
    navigateToWaitlistWithMetadata,
    onGranularityChange,
    onSeasonOrEpisodeChange,
    handleConfirmRequest,
  };
}
