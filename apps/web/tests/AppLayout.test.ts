import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Sidebar from '../src/components/layout/Sidebar.vue';
import Header from '../src/components/layout/Header.vue';
import AppLayout from '../src/components/layout/AppLayout.vue';
import { useAuthStore } from '../src/stores/auth';
import { useFeatureFlags } from '../src/composables/useFeatureFlags';

vi.mock('../src/composables/useProgressSocket', () => ({
  useProgressSocket: () => ({
    isConnected: { value: true },
  }),
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => ({ path: '/dashboard' }),
    useRouter: () => ({ push: vi.fn() }),
  };
});

// Mock modals inside AppLayout
vi.mock('../src/components/UserInviteModal.vue', () => ({
  default: { name: 'UserInviteModal', template: '<div data-testid="invite-modal" />' },
}));
vi.mock('../src/components/UserSettingsModal.vue', () => ({
  default: { name: 'UserSettingsModal', template: '<div data-testid="settings-modal" />' },
}));

describe('AppLayout & Cinema Navigation Shell (Ticket #246)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const ff = useFeatureFlags();
    ff.reset();
  });

  it('Sidebar renders navigation links when features are enabled', () => {
    const ff = useFeatureFlags();
    ff.setFlags({
      manual_torrents: true,
      waitlist: true,
      jellyfin_library_view: true,
      seasonal_anime: true,
      watch_parties: true,
    });
    const authStore = useAuthStore();
    authStore.user = { id: 'admin_1', username: 'admin', role: 'admin' };

    const wrapper = mount(Sidebar, {
      props: {
        collapsed: false,
        mobileOpen: false,
      },
      global: {
        stubs: ['router-link'],
      },
    });

    const links = wrapper.findAll('router-link-stub');
    const paths = links.map((l) => l.attributes('to'));

    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/library');
    expect(paths).toContain('/request');
    expect(paths).toContain('/waitlist');
    expect(paths).toContain('/anime');
    expect(paths).toContain('/party');
    expect(paths).toContain('/admin');
  });

  it('Sidebar hides admin link for non-admin users', () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'user_1', username: 'bob', role: 'user' };

    const wrapper = mount(Sidebar, {
      props: {
        collapsed: false,
        mobileOpen: false,
      },
      global: {
        stubs: ['router-link'],
      },
    });

    const links = wrapper.findAll('router-link-stub');
    const paths = links.map((l) => l.attributes('to'));
    expect(paths).not.toContain('/admin');
  });

  it('Sidebar disables links with opacity and tooltip when feature flag is off', () => {
    const ff = useFeatureFlags();
    ff.setFlags({
      manual_torrents: false,
      waitlist: false,
      jellyfin_library_view: false,
    });

    const wrapper = mount(Sidebar, {
      props: {
        collapsed: false,
        mobileOpen: false,
      },
      global: {
        stubs: ['router-link'],
      },
    });

    const links = wrapper.findAll('router-link-stub');
    const libLink = links.find((l) => l.attributes('to') === '/library');
    expect(libLink?.classes()).toContain('opacity-40');
    expect(libLink?.classes()).toContain('pointer-events-none');
    expect(libLink?.attributes('title')).toContain('temporarily unavailable');
  });

  it('Sidebar emits toggle-collapsed and open-invite', async () => {
    const wrapper = mount(Sidebar, {
      props: {
        collapsed: false,
        mobileOpen: false,
      },
      global: {
        stubs: ['router-link'],
      },
    });

    const inviteBtn = wrapper.find('button[title="Invite Friends"], button:has(span)');
    expect(inviteBtn.exists()).toBe(true);

    const toggleBtn = wrapper.find('button[title="Collapse sidebar"]');
    expect(toggleBtn.exists()).toBe(true);
    await toggleBtn.trigger('click');
    expect(wrapper.emitted('toggle-collapsed')).toBeTruthy();
  });

  it('Header renders live feed connected badge and title', () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'u1', username: 'alex', role: 'user' };

    const wrapper = mount(Header);
    expect(wrapper.text()).toContain('Dashboard');
    expect(wrapper.text()).toContain('LIVE FEED CONNECTED');
    expect(wrapper.text()).toContain('A'); // User initial Alex
  });

  it('Header emits open-menu for mobile hamburger', async () => {
    const wrapper = mount(Header);
    const menuBtn = wrapper.find('button[aria-label="Open navigation"]');
    expect(menuBtn.exists()).toBe(true);
    await menuBtn.trigger('click');
    expect(wrapper.emitted('open-menu')).toBeTruthy();
  });

  it('AppLayout renders slot content and manages collapsed sidebar state', async () => {
    const wrapper = mount(AppLayout, {
      slots: {
        default: '<div data-testid="test-content">Welcome to LalaMovies</div>',
      },
      global: {
        stubs: ['router-link'],
      },
    });

    expect(wrapper.find('[data-testid="test-content"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Welcome to LalaMovies');
  });
});
