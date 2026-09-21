import { ref, computed, watch, nextTick, type Ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import type { MediaType } from '../stores/requests';
import { parseTorrentFile } from '../lib/torrentParser';
import { cleanTorrentTitle, extractEpisodeInfo } from '../lib/torrentTitleCleaner';
import type { BatchItem } from './requestTypes';

export interface UseRequestStep1Options {
  mediaType: Ref<MediaType>;
  seasonNumber: Ref<number | null>;
  onResetCandidates?: () => void;
}

export function useRequestStep1(options: UseRequestStep1Options) {
  const { mediaType, seasonNumber, onResetCandidates } = options;
  const authStore = useAuthStore();

  const inputMode = ref<'search' | 'magnet' | 'file'>('search');
  const magnetLink = ref('');
  const selectedFile = ref<File | null>(null);
  const batchItems = ref<BatchItem[]>([]);
  const batchSeasonInput = ref<number | null>(1);
  const customQuery = ref('');
  const isSearching = ref(false);
  const step1Error = ref<string | null>(null);
  const step1Ref = ref<{ customQueryInputRef: HTMLInputElement | null } | null>(null);
  const isPrivateEpisodic = ref(false);

  const validBatchItems = computed(() => batchItems.value.filter((i) => !i.error));
  const invalidBatchItems = computed(() => batchItems.value.filter((i) => Boolean(i.error)));
  const totalBatchSize = computed(() =>
    validBatchItems.value.reduce((acc, i) => acc + (i.parsed?.totalSize || i.fileSizeBytes), 0)
  );

  const mediaTypeOptions = computed<{ value: MediaType; label: string; icon: string }[]>(() => {
    const opts: { value: MediaType; label: string; icon: string }[] = [
      { value: 'movie', label: 'Movie', icon: '🎬' },
      { value: 'tv_show', label: 'TV Show', icon: '📺' },
      { value: 'anime', label: 'Anime', icon: '⛩️' },
    ];
    if (authStore.isTrusted) {
      opts.push({ value: 'private', label: 'Private', icon: '🔒' });
    }
    return opts;
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
      seasonNumber.value = null;
      batchSeasonInput.value = 1;
      onResetCandidates?.();
    }
  }

  function clearAllBatchItems() {
    batchItems.value = [];
    selectedFile.value = null;
    magnetLink.value = '';
    customQuery.value = '';
    seasonNumber.value = null;
    batchSeasonInput.value = 1;
    onResetCandidates?.();
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

  return {
    inputMode,
    magnetLink,
    selectedFile,
    batchItems,
    batchSeasonInput,
    validBatchItems,
    invalidBatchItems,
    totalBatchSize,
    customQuery,
    isSearching,
    step1Error,
    step1Ref,
    mediaTypeOptions,
    isPrivateEpisodic,
    applySeasonToAll,
    removeBatchItem,
    clearAllBatchItems,
    processFiles,
  };
}
