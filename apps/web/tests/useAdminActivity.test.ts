import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAdminActivity } from '../src/composables/useAdminActivity';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useAdminActivity composable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads sessions and computes activeSessionCount', async () => {
    const mockData = {
      sessions: [
        {
          id: 'sess-1',
          userName: 'Alexandre',
          client: 'WebOS',
          deviceName: 'LG TV',
          playMethod: 'DirectPlay',
          isHardwareAccelerated: false,
        },
      ],
      system: {
        cpuPercent: 30,
        cpuCores: 8,
        memUsedBytes: 4000000000,
        memTotalBytes: 16000000000,
        gpu: {
          name: 'NVIDIA RTX 3070',
          utilizationGpuPercent: 20,
          utilizationEncoderPercent: 5,
          vramUsedBytes: 2000000000,
          vramTotalBytes: 8000000000,
        },
      },
    };
    (api.get as any).mockResolvedValue(mockData);

    const { sessions, systemMetrics, activeSessionCount, fetchActivity } = useAdminActivity({ autoPoll: false });

    await fetchActivity(true);

    expect(api.get).toHaveBeenCalledWith('/admin/activity');
    expect(sessions.value).toHaveLength(1);
    expect(activeSessionCount.value).toBe(1);
    expect(systemMetrics.value).toEqual(mockData.system);
  });

  it('stops session via api and refreshes sessions', async () => {
    (api.get as any).mockResolvedValue({ sessions: [] });
    (api.post as any).mockResolvedValue({ success: true });

    const { stopSession } = useAdminActivity({ autoPoll: false });

    await stopSession('sess-1', 'Maintenance message');

    expect(api.post).toHaveBeenCalledWith('/admin/activity/sessions/sess-1/stop', {
      message: 'Maintenance message',
    });
    expect(api.get).toHaveBeenCalledWith('/admin/activity');
  });
});
