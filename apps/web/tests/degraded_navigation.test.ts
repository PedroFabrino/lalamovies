import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Navbar from '../src/components/Navbar.vue';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../src/stores/auth';
import { useFeatureFlags } from '../src/composables/useFeatureFlags';
import { useRequestsStore } from '../src/stores/requests';
import { router } from '../src/router';

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

describe('Degraded Navigation & Router Redirect Guards (Subtask #89)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const ff = useFeatureFlags();
    ff.reset();
  });

  it('Navbar renders links normally when all features are enabled', () => {
    const ff = useFeatureFlags();
    ff.setFlags({
      manual_torrents: true,
      waitlist: true,
    });

    const wrapper = mount(Navbar, {
      global: {
        stubs: ['router-link'],
      },
    });

    const links = wrapper.findAll('router-link-stub');
    const requestLink = links.find((l) => l.attributes('to') === '/request');
    const waitlistLink = links.find((l) => l.attributes('to') === '/waitlist');

    expect(requestLink?.classes()).not.toContain('pointer-events-none');
    expect(waitlistLink?.classes()).not.toContain('pointer-events-none');
    expect(requestLink?.attributes('title')).toBeUndefined();
    expect(waitlistLink?.attributes('title')).toBeUndefined();
  });

  it('Navbar renders greyed-out disabled link and tooltip when feature flag is disabled', () => {
    const ff = useFeatureFlags();
    ff.setFlags({
      manual_torrents: false,
      waitlist: false,
    });

    const wrapper = mount(Navbar, {
      global: {
        stubs: ['router-link'],
      },
    });

    const links = wrapper.findAll('router-link-stub');
    const requestLink = links.find((l) => l.attributes('to') === '/request');
    const waitlistLink = links.find((l) => l.attributes('to') === '/waitlist');

    expect(requestLink?.classes()).toContain('opacity-40');
    expect(requestLink?.classes()).toContain('pointer-events-none');
    expect(requestLink?.attributes('title')).toContain('temporarily unavailable');

    expect(waitlistLink?.classes()).toContain('opacity-40');
    expect(waitlistLink?.classes()).toContain('pointer-events-none');
    expect(waitlistLink?.attributes('title')).toContain('temporarily unavailable');
  });

  it('Router guard redirects direct navigation to disabled feature route and shows toast', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 'usr_1', username: 'alice', role: 'user', jellyfinUserId: 'jf_1' };
    authStore.initialCheckDone = true;

    const ff = useFeatureFlags();
    ff.setFlags({
      waitlist: false,
      manual_torrents: true,
    });

    const requestsStore = useRequestsStore();
    const showToastSpy = vi.spyOn(requestsStore, 'showToast');

    await router.push('/dashboard');
    await router.isReady();

    // Attempt direct navigation to disabled /waitlist route
    await router.push('/waitlist');

    // Should redirect to dashboard
    expect(router.currentRoute.value.path).toBe('/dashboard');
    expect(showToastSpy).toHaveBeenCalledWith('This feature is temporarily unavailable.', 'info');
  });
});
