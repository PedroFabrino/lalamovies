import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminView from '../src/views/AdminView.vue';
import { api } from '../src/lib/api';

import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock Navbar
vi.mock('../src/components/Navbar.vue', () => ({
  default: {
    name: 'Navbar',
    template: '<nav data-testid="navbar-mock"></nav>',
  },
}));

describe('AdminView - Activity Tab Integration', () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    authStore.user = { id: 'admin-1', username: 'admin', role: 'admin' } as any;

    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/admin/activity') {
        return Promise.resolve({
          sessions: [
            {
              id: 'sess-test',
              userName: 'Alexandre',
              client: 'WebOS',
              deviceName: 'LG Smart TV',
              playMethod: 'DirectPlay',
              isHardwareAccelerated: false,
              nowPlayingItem: {
                id: 'm-1',
                name: 'Test Movie',
                type: 'Movie',
              },
            },
          ],
        });
      }
      if (url === '/admin/users') {
        return Promise.resolve({ users: [] });
      }
      if (url === '/invites') {
        return Promise.resolve({ invites: [] });
      }
      if (url === '/admin/config') {
        return Promise.resolve({ config: {} });
      }
      if (url === '/admin/disk') {
        return Promise.resolve({ totalBytes: 1000, freeBytes: 500, percentFree: 50 });
      }
      if (url === '/admin/features') {
        return Promise.resolve({ features: [] });
      }
      return Promise.resolve({});
    });
  });

  it('renders Activity tab and shows live session count badge', async () => {
    const wrapper = mount(AdminView);
    await flushPromises();

    // Check tab list contains Activity
    expect(wrapper.text()).toContain('Activity');
    // Session count badge should be present
    expect(wrapper.text()).toContain('1');

    // Click Activity tab
    const activityTabBtn = wrapper.findAll('button').find((b) => b.text().includes('Activity'));
    expect(activityTabBtn).toBeDefined();
    await activityTabBtn!.trigger('click');
    await flushPromises();

    // Should render active sessions header and session card
    expect(wrapper.text()).toContain('Active Playback Sessions');
    expect(wrapper.text()).toContain('Alexandre');
    expect(wrapper.text()).toContain('LG Smart TV');
    expect(wrapper.text()).toContain('Test Movie');
  });
});
