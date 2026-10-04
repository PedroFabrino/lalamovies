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
    };
    (api.get as any).mockResolvedValue(mockData);

    const { sessions, activeSessionCount, fetchActivity } = useAdminActivity({ autoPoll: false });

    await fetchActivity(true);

    expect(api.get).toHaveBeenCalledWith('/admin/activity');
    expect(sessions.value).toHaveLength(1);
    expect(activeSessionCount.value).toBe(1);
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
