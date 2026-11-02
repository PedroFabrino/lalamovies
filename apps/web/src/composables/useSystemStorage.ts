import { ref, computed } from 'vue';
import { api } from '../lib/api';

export interface SystemStorageInfo {
  percentFree: number;
  percentUsed: number;
  warnThreshold: number;
  rejectThreshold: number;
  storageQuotaGb: number;
  storageQuotaBytes: number;
  storageFootprintBytes: number;
  storageFootprintGb: number;
  quotaUsedPercent: number;
}

export function formatStorageCapacity(gb: number): string {
  if (!gb || gb <= 0) return '0GB';
  if (gb >= 1000) {
    const tb = gb / 1024;
    return `${Number(tb.toFixed(1))}TB`;
  }
  return `${Number(gb.toFixed(1))}GB`;
}

// Module-level shared state across components
const storageInfo = ref<SystemStorageInfo | null>(null);
const isLoadingStorage = ref(false);
const storageError = ref<string | null>(null);

export function resetStorageState() {
  storageInfo.value = null;
  isLoadingStorage.value = false;
  storageError.value = null;
}

export function useSystemStorage() {
  const fetchStorage = async (force = false) => {
    if (storageInfo.value && !force) return;
    isLoadingStorage.value = true;
    storageError.value = null;

    try {
      // First try /system/storage (available to all authenticated users)
      const data = await api.get<SystemStorageInfo>('/system/storage');
      storageInfo.value = data;
    } catch {
      // Fallback attempt: /admin/disk if user has admin privileges
      try {
        const adminData = await api.get<SystemStorageInfo>('/admin/disk');
        storageInfo.value = adminData;
      } catch (err: unknown) {
        storageError.value = err instanceof Error ? err.message : 'Failed to fetch storage info';
      }
    } finally {
      isLoadingStorage.value = false;
    }
  };

  const storagePercent = computed(() => {
    if (!storageInfo.value) return 0;
    const pct = storageInfo.value.quotaUsedPercent ?? storageInfo.value.percentUsed ?? 0;
    return Math.min(100, Math.max(0, Math.round(pct)));
  });

  const formattedFootprint = computed(() => {
    return formatStorageCapacity(storageInfo.value?.storageFootprintGb ?? 0);
  });

  const formattedQuota = computed(() => {
    return formatStorageCapacity(storageInfo.value?.storageQuotaGb ?? 0);
  });

  const storageBarColor = computed(() => {
    const pct = storagePercent.value;
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-gradient-to-r from-accent-indigo to-accent-violet';
  });

  const storagePercentTextClass = computed(() => {
    const pct = storagePercent.value;
    if (pct >= 90) return 'text-rose-400 font-semibold';
    if (pct >= 80) return 'text-amber-400 font-semibold';
    return 'text-zinc-400';
  });

  return {
    storageInfo,
    isLoadingStorage,
    storageError,
    fetchStorage,
    storagePercent,
    formattedFootprint,
    formattedQuota,
    storageBarColor,
    storagePercentTextClass,
  };
}
