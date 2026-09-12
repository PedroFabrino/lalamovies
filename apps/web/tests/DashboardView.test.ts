import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DashboardView from '../src/views/DashboardView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useRoute: () => ({
    query: {},
    params: {},
  }),
}));

vi.mock('../src/components/Navbar.vue', () => ({
  default: {
    template: '<div data-testid="mock-navbar"></div>',
  },
}));

vi.mock('../src/components/UpNextShelf.vue', () => ({
  default: {
    template: '<div data-testid="mock-up-next"></div>',
  },
}));

vi.mock('../src/components/DiscoveryFeed.vue', () => ({
  default: {
    template: '<div data-testid="mock-discovery-feed"></div>',
  },
}));

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
    }
  },
}));

describe('DashboardView - Co-Requester Action Gating (Ticket 03)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('hides delete button and keep button when isPrimaryRequester is false', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'usr_bob', username: 'bob', role: 'user', jellyfinUserId: 'jf_bob' };

    vi.mocked(api.get).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/requests') {
        return {
          requests: [
            {
              id: 'req_primary',
              userId: 'usr_bob',
              title: 'Bob Movie',
              mediaType: 'movie',
              status: 'downloading',
              metadataId: '1',
              metadataSource: 'tmdb',
              requestedAt: new Date().toISOString(),
              isPrimaryRequester: true,
              keepFlag: false,
            },
            {
              id: 'req_co',
              userId: 'usr_alice',
              title: 'Alice Movie',
              mediaType: 'movie',
              status: 'downloading',
              metadataId: '2',
              metadataSource: 'tmdb',
              requestedAt: new Date().toISOString(),
              isPrimaryRequester: false,
              keepFlag: false,
            },
          ],
        };
      }
      return {};
    });

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          'router-link': true,
        },
      },
    });
    await flushPromises();

    // Table rows
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(2);

    // Row 1 (primary) should have delete button
    const row1DeleteBtn = rows[0].find('button[title="Delete Request"]');
    expect(row1DeleteBtn.exists()).toBe(true);

    // Row 2 (co-requester) should NOT have delete button
    const row2DeleteBtn = rows[1].find('button[title="Delete Request"]');
    expect(row2DeleteBtn.exists()).toBe(false);
  });

  it('hides keep toggle button for admin when isPrimaryRequester is false', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'usr_admin', username: 'admin', role: 'admin', jellyfinUserId: 'jf_admin' };

    vi.mocked(api.get).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/requests') {
        return {
          requests: [
            {
              id: 'req_1',
              userId: 'usr_admin',
              title: 'Admin Movie',
              mediaType: 'movie',
              status: 'downloading',
              metadataId: '1',
              metadataSource: 'tmdb',
              requestedAt: new Date().toISOString(),
              isPrimaryRequester: true,
              keepFlag: false,
            },
            {
              id: 'req_2',
              userId: 'usr_other',
              title: 'Other Movie Co-Requested',
              mediaType: 'movie',
              status: 'downloading',
              metadataId: '2',
              metadataSource: 'tmdb',
              requestedAt: new Date().toISOString(),
              isPrimaryRequester: false,
              keepFlag: false,
            },
          ],
        };
      }
      return {};
    });

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          'router-link': true,
        },
      },
    });
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(2);

    // Row 1 has keep toggle button
    const row1KeepBtn = rows[0].find('button[title*="Keep"]');
    expect(row1KeepBtn.exists()).toBe(true);

    // Row 2 (isPrimaryRequester: false) does NOT have keep toggle button
    const row2KeepBtn = rows[1].find('button[title*="Keep"]');
    expect(row2KeepBtn.exists()).toBe(false);
  });

  describe('Admin Dashboard Co-Requesters Grouping (Ticket 05)', () => {
    it('renders coRequesters inline alongside primary requester for admin', async () => {
      const authStore = useAuthStore();
      authStore.user = { id: 'usr_admin', username: 'admin', role: 'admin', jellyfinUserId: 'jf_admin' };

      vi.mocked(api.get).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/requests') {
          return {
            requests: [
              {
                id: 'req_with_co',
                userId: 'usr_alice',
                requesterUsername: 'alice',
                title: 'Popular Movie',
                mediaType: 'movie',
                status: 'downloading',
                metadataId: '10',
                metadataSource: 'tmdb',
                requestedAt: new Date().toISOString(),
                isPrimaryRequester: true,
                keepFlag: false,
                coRequesters: ['bob', 'charlie'],
              },
              {
                id: 'req_solo',
                userId: 'usr_david',
                requesterUsername: 'david',
                title: 'Solo Movie',
                mediaType: 'movie',
                status: 'downloading',
                metadataId: '11',
                metadataSource: 'tmdb',
                requestedAt: new Date().toISOString(),
                isPrimaryRequester: true,
                keepFlag: false,
                coRequesters: [],
              },
            ],
          };
        }
        return {};
      });

      const wrapper = mount(DashboardView, {
        global: {
          stubs: {
            'router-link': true,
          },
        },
      });
      await flushPromises();

      const rows = wrapper.findAll('tbody tr');
      expect(rows.length).toBe(2);

      // Row 1: has coRequesters
      const row1 = rows[0];
      const requesterGroup = row1.find('[data-testid="admin-requester-group"]');
      expect(requesterGroup.exists()).toBe(true);
      expect(requesterGroup.text()).toContain('alice');
      expect(requesterGroup.text()).toContain('bob');
      expect(requesterGroup.text()).toContain('charlie');

      const badges = row1.findAll('[data-testid="co-requester-badge"]');
      expect(badges.length).toBe(2);
      expect(badges[0].text()).toContain('bob');
      expect(badges[0].text()).toContain('(co-req)');
      expect(badges[1].text()).toContain('charlie');
      expect(badges[1].text()).toContain('(co-req)');

      // Row 2: no coRequesters
      const row2 = rows[1];
      expect(row2.find('[data-testid="admin-requester-group"]').exists()).toBe(false);
      expect(row2.text()).toContain('david');
      expect(row2.findAll('[data-testid="co-requester-badge"]').length).toBe(0);
    });
  });
});
