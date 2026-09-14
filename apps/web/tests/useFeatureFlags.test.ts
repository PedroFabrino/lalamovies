import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFeatureFlags } from '../src/composables/useFeatureFlags';
import { api } from '../src/lib/api';

describe('useFeatureFlags Composable (Subtask #88)', () => {
  beforeEach(() => {
    const ff = useFeatureFlags();
    ff.reset();
    vi.restoreAllMocks();
  });

  it('initializes with default isEnabled true and fetches flags via api.get', async () => {
    const ff = useFeatureFlags();
    expect(ff.isEnabled('streaming')).toBe(true);
    expect(ff.isLoaded.value).toBe(false);

    vi.spyOn(api, 'get').mockResolvedValueOnce({
      streaming: false,
      waitlist: true,
      discovery_feed: true,
    });

    await ff.fetchFlags();

    expect(ff.isLoaded.value).toBe(true);
    expect(ff.isEnabled('streaming')).toBe(false);
    expect(ff.isEnabled('waitlist')).toBe(true);
    expect(ff.isEnabled('discovery_feed')).toBe(true);
    expect(ff.isEnabled('unspecified_flag')).toBe(true);
  });

  it('updates reactive state instantly upon feature_flags_updated WebSocket event', async () => {
    const ff = useFeatureFlags();
    ff.setFlags({
      streaming: true,
      waitlist: true,
    });

    expect(ff.isEnabled('streaming')).toBe(true);

    // Simulate WebSocket event dispatched on window
    const wsEvent = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'feature_flags_updated',
        flags: {
          streaming: false,
          waitlist: false,
        },
      }),
    });

    window.dispatchEvent(wsEvent);

    expect(ff.isEnabled('streaming')).toBe(false);
    expect(ff.isEnabled('waitlist')).toBe(false);
  });

  it('handles payload.flags format in WebSocket event', async () => {
    const ff = useFeatureFlags();
    ff.setFlags({
      automated_cleanup: true,
    });

    const wsEvent = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'feature_flags_updated',
        payload: {
          flags: {
            automated_cleanup: false,
          },
        },
      }),
    });

    window.dispatchEvent(wsEvent);

    expect(ff.isEnabled('automated_cleanup')).toBe(false);
  });
});
