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

describe('AdminView - Trusted Role and Invites (Issue #39)', () => {
  const mockUsers = [
    { id: 'admin_1', username: 'admin', role: 'admin', email: 'admin@test.local', createdAt: '2026-09-01T00:00:00Z' },
    { id: 'user_1', username: 'alice', role: 'user', email: 'alice@test.local', createdAt: '2026-09-02T00:00:00Z' },
    { id: 'trusted_1', username: 'bob', role: 'trusted', email: 'bob@test.local', createdAt: '2026-09-03T00:00:00Z' },
  ];

  const mockInvites = [
    {
      id: 'inv_1',
      token: '11112222333344445555666677778888',
      role: 'trusted',
      createdByUserId: 'admin_1',
      creatorUsername: 'admin',
      expiresAt: '2026-09-20T00:00:00Z',
      usedAt: null,
      status: 'pending',
    },
    {
      id: 'inv_2',
      token: 'aaaabbbbccccddddeeeeffff00001111',
      role: 'user',
      createdByUserId: 'admin_1',
      creatorUsername: 'admin',
      expiresAt: '2026-09-19T00:00:00Z',
      usedAt: null,
      status: 'pending',
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    const authStore = useAuthStore();
    authStore.user = { id: 'admin_1', username: 'admin', role: 'admin', jellyfinUserId: 'jf_admin' };

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/admin/users') return { users: JSON.parse(JSON.stringify(mockUsers)) };
      if (url === '/invites') return { invites: JSON.parse(JSON.stringify(mockInvites)) };
      if (url === '/admin/config') return { config: {} };
      if (url === '/admin/disk') return { percentFree: 50, percentUsed: 50, warnThreshold: 20, rejectThreshold: 15, storageQuotaGb: 150, storageQuotaBytes: 150 * 1024 * 1024 * 1024, storageFootprintBytes: 0, storageFootprintGb: 0, quotaUsedPercent: 0 };
      if (url === '/admin/cleanup/candidates') return { candidates: [] };
      if (url === '/admin/features') return { features: [] };
      return {};
    });
  });

  it('renders user table with trusted badge and role select dropdown', async () => {
    const wrapper = mount(AdminView);
    await flushPromises();

    expect(wrapper.text()).toContain('alice');
    expect(wrapper.text()).toContain('bob');

    // Trusted badge
    const trustedBadge = wrapper.findAll('span').find((s) => s.text() === 'trusted');
    expect(trustedBadge).toBeDefined();
    expect(trustedBadge!.classes()).toContain('bg-emerald-500/20');
    expect(trustedBadge!.classes()).toContain('text-emerald-300');

    // Role select dropdowns for non-self users (alice and bob)
    const selects = wrapper.findAll('select');
    // Finds role select for alice
    const aliceSelect = selects.find((s) => (s.element as HTMLSelectElement).value === 'user');
    expect(aliceSelect).toBeDefined();

    // Verify select has user, trusted, admin options
    const options = aliceSelect!.findAll('option').map((o) => o.text().trim());
    expect(options).toEqual(['User', 'Trusted', 'Admin']);
  });

  it('changes user role via PATCH /admin/users/:id/role when role select changes', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({
      user: { id: 'user_1', username: 'alice', role: 'trusted', email: 'alice@test.local', createdAt: '2026-09-02T00:00:00Z' },
    });

    const wrapper = mount(AdminView);
    await flushPromises();

    const selects = wrapper.findAll('select');
    const aliceSelect = selects.find((s) => (s.element as HTMLSelectElement).value === 'user');
    expect(aliceSelect).toBeDefined();

    await aliceSelect!.setValue('trusted');
    await flushPromises();

    expect(api.patch).toHaveBeenCalledWith('/admin/users/user_1/role', { role: 'trusted' });
  });

  it('renders invite modal with role dropdown and sends role in POST /invites', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      invite: {
        id: 'inv_new',
        token: 'newtoken1234567890abcdef123456',
        role: 'trusted',
        createdByUserId: 'admin_1',
        creatorUsername: 'admin',
        expiresAt: '2026-09-21T00:00:00Z',
        usedAt: null,
        status: 'pending',
      },
      url: 'http://localhost:5173/invite/newtoken1234567890abcdef123456',
    });

    const wrapper = mount(AdminView);
    await flushPromises();

    // Click "Invite Friend"
    const inviteBtn = wrapper.findAll('button').find((b) => b.text().includes('Invite Friend'));
    expect(inviteBtn).toBeDefined();
    await inviteBtn!.trigger('click');
    await flushPromises();

    // Invite modal is open
    expect(wrapper.text()).toContain('Invite a Friend');

    // Role select in invite modal
    const inviteRoleSelect = wrapper.find('#inviteRole');
    expect(inviteRoleSelect.exists()).toBe(true);
    expect((inviteRoleSelect.element as HTMLSelectElement).value).toBe('user');

    // Change to trusted
    await inviteRoleSelect.setValue('trusted');

    // Click Create Invite Link
    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('Create Invite Link'));
    expect(createBtn).toBeDefined();
    await createBtn!.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/invites', {
      expiresInHours: 24,
      role: 'trusted',
    });
  });

  it('renders invites table with role column and badges', async () => {
    const wrapper = mount(AdminView);
    await flushPromises();

    expect(wrapper.text()).toContain('Pending & Recent Invites');
    // Check for role badge in invites table
    const badges = wrapper.findAll('span').map((s) => s.text());
    expect(badges).toContain('trusted');
    expect(badges).toContain('user');
  });
});
