import { ref, type Ref } from 'vue';
import { api } from '../lib/api';
import type { DiskInfo } from '../components/admin/AdminCleanupTab.vue';
import type { DownloadRequest } from '../stores/requests';

export function useAdminCleanup(
  modalAction: Ref<{
    title: string;
    message: string;
    isExecuting: boolean;
    onConfirm: () => Promise<void>;
  } | null>
) {
  const diskInfo = ref<DiskInfo | null>(null);
  const candidatesList = ref<DownloadRequest[]>([]);
  const isLoadingCandidates = ref(false);
  const isRunningScan = ref(false);
  const scanFeedback = ref<string | null>(null);

  async function loadDiskAndCandidates() {
    isLoadingCandidates.value = true;
    try {
      const [diskData, candData] = await Promise.all([
        api.get<DiskInfo>('/admin/disk'),
        api.get<{ candidates: DownloadRequest[] }>('/admin/cleanup/candidates'),
      ]);
      diskInfo.value = diskData;
      candidatesList.value = candData.candidates;
    } catch {
      // handled
    } finally {
      isLoadingCandidates.value = false;
    }
  }

  async function handleRunScan() {
    isRunningScan.value = true;
    scanFeedback.value = null;

    try {
      const data = await api.post<{ scheduled: DownloadRequest[] }>('/admin/cleanup');
      if (data.scheduled.length > 0) {
        scanFeedback.value = `Cleanup scan completed: scheduled ${data.scheduled.length} item(s) for deletion.`;
      } else {
        scanFeedback.value = 'Cleanup scan completed: disk space is healthy, no items scheduled.';
      }
      await loadDiskAndCandidates();
    } catch {
      scanFeedback.value = 'Failed to run cleanup scan.';
    } finally {
      isRunningScan.value = false;
    }
  }

  function confirmCleanItem(cand: DownloadRequest) {
    modalAction.value = {
      title: 'Clean Item Immediately?',
      message: `Are you sure you want to clean "${cand.title}" now? This will remove files and torrent immediately without the 24-hour waiting period.`,
      isExecuting: false,
      onConfirm: async () => {
        if (!modalAction.value) return;
        modalAction.value.isExecuting = true;
        try {
          await api.post(`/admin/cleanup/${cand.id}`);
          candidatesList.value = candidatesList.value.filter((c) => c.id !== cand.id);
          modalAction.value = null;
          await loadDiskAndCandidates();
        } catch {
          if (modalAction.value) {
            modalAction.value.isExecuting = false;
          }
        }
      },
    };
  }

  return {
    diskInfo,
    candidatesList,
    isLoadingCandidates,
    isRunningScan,
    scanFeedback,
    loadDiskAndCandidates,
    handleRunScan,
    confirmCleanItem,
  };
}
