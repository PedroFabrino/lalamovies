import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { api } from '../lib/api';

export interface PlaybackSessionItem {
  id: string;
  name: string;
  seriesName?: string;
  seasonName?: string;
  episodeIndex?: number;
  seasonIndex?: number;
  productionYear?: number;
  type: string;
  primaryImageTag?: string;
  backdropImageTag?: string;
  runTimeTicks?: number;
}

export interface PlaybackSessionPlayState {
  positionTicks?: number;
  isPaused: boolean;
  playMethod: 'DirectPlay' | 'DirectStream' | 'Transcode';
  repeatMode?: string;
}

export interface PlaybackSessionTranscodingInfo {
  audioCodec?: string;
  videoCodec?: string;
  container?: string;
  isVideoDirect?: boolean;
  isAudioDirect?: boolean;
  bitrate?: number;
  framerate?: number;
  completionPercentage?: number;
  transcodeReasons?: string[];
  hardwareAccelerationType?: string;
}

export interface PlaybackSession {
  id: string;
  userId?: string;
  userName: string;
  userPrimaryImageTag?: string;
  client: string;
  deviceName: string;
  deviceId?: string;
  applicationVersion?: string;
  nowPlayingItem?: PlaybackSessionItem;
  playState?: PlaybackSessionPlayState;
  transcodingInfo?: PlaybackSessionTranscodingInfo;
  playMethod: 'DirectPlay' | 'DirectStream' | 'Transcode';
  isHardwareAccelerated: boolean;
  bandwidthBps?: number;
}

export interface GpuMetrics {
  name: string;
  driverVersion?: string;
  utilizationGpuPercent: number;
  utilizationEncoderPercent: number;
  vramUsedBytes: number;
  vramTotalBytes: number;
}

export interface SystemMetrics {
  cpuPercent: number;
  cpuCores: number;
  memUsedBytes: number;
  memTotalBytes: number;
  gpu: GpuMetrics | null;
}

export interface ActivityResponse {
  sessions: PlaybackSession[];
  system?: SystemMetrics;
}

export function useAdminActivity(options: { autoPoll?: boolean; pollIntervalMs?: number } = {}) {
  const { autoPoll = true, pollIntervalMs = 3000 } = options;

  const sessions = ref<PlaybackSession[]>([]);
  const systemMetrics = ref<SystemMetrics | null>(null);
  const isLoading = ref(false);
  const isStoppingSession = ref(false);
  const error = ref<string | null>(null);

  const activeSessionCount = computed(() => sessions.value.length);

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function fetchActivity(showLoading = false) {
    if (showLoading) {
      isLoading.value = true;
    }
    error.value = null;
    try {
      const data = await api.get<ActivityResponse>('/admin/activity');
      sessions.value = data.sessions || [];
      systemMetrics.value = data.system || null;
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Failed to load playback activity';
    } finally {
      if (showLoading) {
        isLoading.value = false;
      }
    }
  }

  async function stopSession(sessionId: string, message?: string) {
    isStoppingSession.value = true;
    try {
      await api.post(`/admin/activity/sessions/${encodeURIComponent(sessionId)}/stop`, {
        message: message?.trim() ? message.trim() : undefined,
      });
      await fetchActivity(false);
    } catch (err: unknown) {
      throw new Error((err as Error).message || 'Failed to stop session');
    } finally {
      isStoppingSession.value = false;
    }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      fetchActivity(false);
    }, pollIntervalMs);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchActivity(false);
    }
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      fetchActivity(true);
      if (autoPoll) {
        startPolling();
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    });

    onUnmounted(() => {
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    });
  }

  return {
    sessions,
    systemMetrics,
    isLoading,
    isStoppingSession,
    error,
    activeSessionCount,
    fetchActivity,
    stopSession,
    startPolling,
    stopPolling,
  };
}
