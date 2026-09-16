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

describe('AdminView - Subtitle Transcription Window (Spec #104)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    const authStore = useAuthStore();
    authStore.user = { id: 'admin_1', username: 'admin', role: 'admin', jellyfinUserId: 'jf_admin' };

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/admin/users') return { users: [] };
      if (url === '/invites') return { invites: [] };
      if (url === '/admin/config') {
        return {
          config: {
            transcription_window_start: '03:00',
            transcription_window_end: '06:30',
            transcription_timezone: 'America/Argentina/Buenos_Aires',
          },
        };
      }
      if (url === '/admin/disk') return { percentFree: 50, percentUsed: 50, warnThreshold: 20, rejectThreshold: 15, storageQuotaGb: 150, storageQuotaBytes: 150 * 1024 * 1024 * 1024, storageFootprintBytes: 0, storageFootprintGb: 0, quotaUsedPercent: 0 };
      if (url === '/admin/cleanup/candidates') return { candidates: [] };
      if (url === '/admin/features') return { features: [] };
      if (url === '/admin/jellyfin/status') return { reachable: true, authenticated: true };
      return {};
    });

    vi.mocked(api.patch).mockResolvedValue({ success: true });
  });

  it('populates transcription window settings from /admin/config', async () => {
    const wrapper = mount(AdminView);
    await flushPromises();

    // Switch to config tab
    const configTabBtn = wrapper.findAll('button').find((b) => b.text().includes('System Config'));
    expect(configTabBtn).toBeDefined();
    await configTabBtn!.trigger('click');
    await flushPromises();

    const startInput = wrapper.find<HTMLInputElement>('#transcription_window_start');
    const endInput = wrapper.find<HTMLInputElement>('#transcription_window_end');
    const tzInput = wrapper.find<HTMLInputElement>('#transcription_timezone');

    expect(startInput.exists()).toBe(true);
    expect(startInput.element.value).toBe('03:00');
    expect(endInput.element.value).toBe('06:30');
    expect(tzInput.element.value).toBe('America/Argentina/Buenos_Aires');
  });

  it('submits updated transcription config via api.patch', async () => {
    const wrapper = mount(AdminView);
    await flushPromises();

    // Switch to config tab
    const configTabBtn = wrapper.findAll('button').find((b) => b.text().includes('System Config'));
    await configTabBtn!.trigger('click');
    await flushPromises();

    const startInput = wrapper.find<HTMLInputElement>('#transcription_window_start');
    const endInput = wrapper.find<HTMLInputElement>('#transcription_window_end');

    await startInput.setValue('01:00');
    await endInput.setValue('05:00');

    // Find the save button for transcription settings
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save Transcription Settings'));
    expect(saveBtn).toBeDefined();
    await saveBtn!.trigger('submit');
    await flushPromises();

    expect(api.patch).toHaveBeenCalledWith('/admin/config', expect.objectContaining({
      transcription_window_start: '01:00',
      transcription_window_end: '05:00',
      transcription_timezone: 'America/Argentina/Buenos_Aires',
    }));

    expect(wrapper.text()).toContain('Transcription settings saved successfully.');
  });

  it('updates timezone when "Use Local" is clicked', async () => {
    const wrapper = mount(AdminView);
    await flushPromises();

    // Switch to config tab
    const configTabBtn = wrapper.findAll('button').find((b) => b.text().includes('System Config'));
    await configTabBtn!.trigger('click');
    await flushPromises();

    const useLocalBtn = wrapper.findAll('button').find((b) => b.text() === 'Use Local');
    expect(useLocalBtn).toBeDefined();
    await useLocalBtn!.trigger('click');
    await flushPromises();

    const tzInput = wrapper.find<HTMLInputElement>('#transcription_timezone');
    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    expect(tzInput.element.value).toBe(detectedTz);
  });
});
