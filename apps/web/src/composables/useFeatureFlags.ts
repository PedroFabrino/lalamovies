import { ref } from 'vue';
import { api } from '../lib/api';

const flags = ref<Record<string, boolean>>({});
const isLoading = ref(false);
const isLoaded = ref(false);
const error = ref<string | null>(null);

let listenerAttached = false;

export function handleFeatureFlagsWsMessage(event: MessageEvent | { data: string | object }) {
  try {
    const rawData = event.data;
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    if (data && data.type === 'feature_flags_updated') {
      const updatedFlags = data.flags || data.payload?.flags;
      if (updatedFlags && typeof updatedFlags === 'object') {
        flags.value = { ...flags.value, ...updatedFlags };
      }
    }
  } catch {
    // Ignore JSON parse error
  }
}

function initWsListener() {
  if (typeof window === 'undefined' || listenerAttached) return;
  window.addEventListener('message', handleFeatureFlagsWsMessage);
  listenerAttached = true;
}

export function useFeatureFlags() {
  initWsListener();

  async function fetchFlags(): Promise<Record<string, boolean>> {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await api.get<Record<string, boolean>>('/features');
      flags.value = data || {};
      isLoaded.value = true;
      return flags.value;
    } catch (err) {
      error.value = (err as Error).message || 'Failed to load feature flags';
      return flags.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function ensureFlagsLoaded(): Promise<void> {
    if (!isLoaded.value && !isLoading.value) {
      await fetchFlags();
    }
  }

  function isEnabled(flagId: string): boolean {
    if (flags.value[flagId] === undefined) {
      return true;
    }
    return Boolean(flags.value[flagId]);
  }

  function setFlag(flagId: string, enabled: boolean): void {
    flags.value = { ...flags.value, [flagId]: enabled };
  }

  function setFlags(newFlags: Record<string, boolean>): void {
    flags.value = { ...newFlags };
    isLoaded.value = true;
  }

  function reset(): void {
    flags.value = {};
    isLoaded.value = false;
    isLoading.value = false;
    error.value = null;
  }

  return {
    flags,
    isLoading,
    isLoaded,
    error,
    fetchFlags,
    ensureFlagsLoaded,
    isEnabled,
    setFlag,
    setFlags,
    reset,
    handleWsMessage: handleFeatureFlagsWsMessage,
  };
}
