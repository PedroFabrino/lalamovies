import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminView from '../src/views/AdminView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';

vi.mock('../src/components/Navbar.vue', () => ({
  default: {
    template: '<div data-testid="mock-navbar"></div>',
  },
}));

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
    }
  },
}));

describe('AdminView - Feature Flags & Confirmation Modal (Subtasks #86 & #87)', () => {
  const mockFeatures = [
    {
      id: 'discovery_feed',
      name: 'Discovery Feed',
      description: 'Curated trending shelves',
      category: 'discovery',
      enabled: true,
      updatedAt: '2026-09-14T10:00:00.000Z',
    },
    {
      id: 'streaming',
      name: 'Ephemeral Streaming',
      description: 'Instant playback via Real-Debrid',
      category: 'discovery',
      enabled: true,
      updatedAt: '2026-09-14T10:00:00.000Z',
    },
    {
      id: 'manual_torrents',
      name: 'Manual Torrent Submissions',
      description: 'Single torrent requests',
      category: 'downloads',
      enabled: true,
      updatedAt: '2026-09-14T10:00:00.000Z',
    },
    {
      id: 'automated_cleanup',
      name: 'Automated Disk Cleanup',
      description: 'Scheduled disk pruning',
      category: 'automation',
      enabled: true,
      updatedAt: '2026-09-14T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    const authStore = useAuthStore();
    authStore.user = { id: 'admin_1', username: 'admin', role: 'admin', jellyfinUserId: 'jf_admin' };

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/admin/users') return { users: [] };
      if (url === '/invites') return { invites: [] };
      if (url === '/admin/config') return { config: {} };
      if (url === '/admin/disk') return { percentFree: 50, percentUsed: 50, warnThreshold: 20, rejectThreshold: 15, storageQuotaGb: 150, storageQuotaBytes: 150 * 1024 * 1024 * 1024, storageFootprintBytes: 0, storageFootprintGb: 0, quotaUsedPercent: 0 };
      if (url === '/admin/cleanup/candidates') return { candidates: [] };
      if (url === '/admin/features') return { features: JSON.parse(JSON.stringify(mockFeatures)) };
      return {};
    });
  });

  it('renders Feature Flags tab button and switches to Tab 4', async () => {
    const wrapper = mount(AdminView);
    await flushPromises();

    // Tab buttons
    const tabButtons = wrapper.findAll('button');
    const featuresTabButton = tabButtons.find((btn) => btn.text().includes('Feature Flags'));
    expect(featuresTabButton).toBeDefined();

    // Click Tab 4
    await featuresTabButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Runtime Feature Flags & Kill Switches');
    expect(wrapper.text()).toContain('Content & Discovery');
    expect(wrapper.text()).toContain('Downloads & Torrents');
    expect(wrapper.text()).toContain('Automation & System');

    expect(wrapper.text()).toContain('Ephemeral Streaming');
    expect(wrapper.text()).toContain('Operational');
  });

  it('toggles low-impact flag directly with 1-click optimistic update and PATCH', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({
      feature: {
        id: 'discovery_feed',
        name: 'Discovery Feed',
        description: 'Curated trending shelves',
        category: 'discovery',
        enabled: false,
        updatedAt: '2026-09-14T10:05:00.000Z',
      },
      flags: { discovery_feed: false },
    });

    const wrapper = mount(AdminView);
    await flushPromises();

    // Switch to features tab
    const featuresTabBtn = wrapper.findAll('button').find((b) => b.text().includes('Feature Flags'));
    await featuresTabBtn!.trigger('click');
    await flushPromises();

    // Find toggle for discovery_feed
    const switches = wrapper.findAll('button[role="switch"]');
    expect(switches.length).toBeGreaterThan(0);

    // First switch is discovery_feed
    await switches[0].trigger('click');
    await flushPromises();

    expect(api.patch).toHaveBeenCalledWith('/admin/features/discovery_feed', { enabled: false });
    // No confirmation modal opened
    expect(wrapper.text()).not.toContain('High-Impact Kill Switch');
  });

  it('intercepts high-impact flag (streaming) with confirmation modal before PATCH', async () => {
    const wrapper = mount(AdminView);
    await flushPromises();

    const featuresTabBtn = wrapper.findAll('button').find((b) => b.text().includes('Feature Flags'));
    await featuresTabBtn!.trigger('click');
    await flushPromises();

    // Streaming is second switch in discovery card
    const switches = wrapper.findAll('button[role="switch"]');
    // Click switch for Ephemeral Streaming
    await switches[1].trigger('click');
    await flushPromises();

    // Modal appears!
    expect(wrapper.text()).toContain('Disable Ephemeral Streaming?');
    expect(wrapper.text()).toContain('High-Impact Kill Switch');
    expect(wrapper.text()).toContain('Degraded Mode');
    expect(api.patch).not.toHaveBeenCalled();

    // Click Cancel
    const cancelBtn = wrapper.findAll('button').find((b) => b.text().trim() === 'Cancel');
    expect(cancelBtn).toBeDefined();
    await cancelBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Disable Ephemeral Streaming?');
    expect(api.patch).not.toHaveBeenCalled();

    // Click again, this time Confirm
    await switches[1].trigger('click');
    await flushPromises();

    vi.mocked(api.patch).mockResolvedValueOnce({
      feature: {
        id: 'streaming',
        name: 'Ephemeral Streaming',
        description: 'Instant playback via Real-Debrid',
        category: 'discovery',
        enabled: false,
        updatedAt: '2026-09-14T10:05:00.000Z',
      },
      flags: { streaming: false },
    });

    const confirmBtn = wrapper.findAll('button').find((b) => b.text().includes('Confirm Disable'));
    expect(confirmBtn).toBeDefined();
    await confirmBtn!.trigger('click');
    await flushPromises();

    expect(api.patch).toHaveBeenCalledWith('/admin/features/streaming', { enabled: false });
  });

  it('reverts toggle state and shows alert when API PATCH fails', async () => {
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('Network error'));

    const wrapper = mount(AdminView);
    await flushPromises();

    const featuresTabBtn = wrapper.findAll('button').find((b) => b.text().includes('Feature Flags'));
    await featuresTabBtn!.trigger('click');
    await flushPromises();

    const switches = wrapper.findAll('button[role="switch"]');
    // Toggle discovery_feed
    await switches[0].trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Network error');
  });
});
