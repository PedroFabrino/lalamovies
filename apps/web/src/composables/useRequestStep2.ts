import { ref, type Ref, type ComputedRef } from 'vue';
import { api, ApiError } from '../lib/api';
import { fileToBase64 } from '../lib/torrentParser';
import type { MediaType } from '../stores/requests';
import type { MetadataCandidate, BatchItem } from './requestTypes';

export interface UseRequestStep2Options {
  currentStep: Ref<1 | 2 | 3>;
  mediaType: Ref<MediaType>;
  customQuery: Ref<string>;
  inputMode: Ref<'search' | 'magnet' | 'file'>;
  magnetLink: Ref<string>;
  validBatchItems: ComputedRef<BatchItem[]>;
  step1Error: Ref<string | null>;
  step1Ref: Ref<{ customQueryInputRef: HTMLInputElement | null } | null>;
  isSearching: Ref<boolean>;
  onCandidateSelected?: (candidate: MetadataCandidate) => Promise<void> | void;
  onAnimeTitleChanged?: (title: string) => Promise<void> | void;
}

export function useRequestStep2(options: UseRequestStep2Options) {
  const {
    currentStep,
    mediaType,
    customQuery,
    inputMode,
    magnetLink,
    validBatchItems,
    step1Error,
    step1Ref,
    isSearching,
    onCandidateSelected,
    onAnimeTitleChanged,
  } = options;

  const candidates = ref<MetadataCandidate[]>([]);
  const selectedCandidate = ref<MetadataCandidate | null>(null);
  const step2Error = ref<string | null>(null);
  const step2Ref = ref<{ step2QueryInputRef: HTMLInputElement | null } | null>(null);
  const activeAnimeTitle = ref<string | null>(null);

  const hasCjk = (s?: string | null): boolean =>
    Boolean(s && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(s));

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
    currentStep.value = 3;
    if (onCandidateSelected) {
      await onCandidateSelected(candidate);
    }
  }

  async function confirmStep2Selection() {
    if (!selectedCandidate.value) return;
    await selectCandidate(selectedCandidate.value);
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

  async function setAnimeTitle(title: string) {
    if (activeAnimeTitle.value === title) return;
    activeAnimeTitle.value = title;
    if (onAnimeTitleChanged) {
      await onAnimeTitleChanged(title);
    }
  }

  return {
    candidates,
    selectedCandidate,
    step2Error,
    step2Ref,
    activeAnimeTitle,
    hasCjk,
    handleSearchMetadata,
    selectCandidate,
    confirmStep2Selection,
    skipMetadata,
    setAnimeTitle,
  };
}
