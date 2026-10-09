import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import WaitlistCard from '../src/components/waitlist/WaitlistCard.vue';
import WaitlistEpisodeAdjustPopover from '../src/components/waitlist/WaitlistEpisodeAdjustPopover.vue';
import WaitlistView from '../src/views/WaitlistView.vue';
import { useAuthStore } from '../src/stores/auth';
import { useWaitlistStore, WaitlistEntry } from '../src/stores/waitlist';
import { api } from '../src/lib/api';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
}));

vi.mock('../src/components/Navbar.vue', () => ({
  default: { template: '<div data-testid="mock-navbar"></div>' },
}));

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
    }
  },
}));

function makeSeriesEntry(overrides: Partial<WaitlistEntry> = {}): WaitlistEntry {
  return {
    id: 'entry-series-1',
    userId: 'user-owner',
    mediaType: 'tv_show',
    metadataId: '12345',
    metadataSource: 'tmdb',
    title: 'Severance',
    seasonNumber: 2,
    targetEpisode: 1,
    status: 'pending_release',
    tmdbReleaseDate: '2026-01-15',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Target Episode Adjustment UI Popover and Reactive Re-tiering (#225)', () => {
  let authStore: ReturnType<typeof useAuthStore>;
  let waitlistStore: ReturnType<typeof useWaitlistStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    authStore = useAuthStore();
    waitlistStore = useWaitlistStore();
    authStore.user = { id: 'user-owner', email: 'owner@example.com', username: 'owner', role: 'user' };
  });

  describe('WaitlistCard adjustment controls visibility', () => {
    it('shows adjustment trigger button for owner on active episodic card', () => {
      const entry = makeSeriesEntry({ userId: 'user-owner', status: 'pending_release' });
      const wrapper = mount(WaitlistCard, { props: { entry } });

      const adjustBtn = wrapper.find('[data-testid="adjust-target-btn"]');
      expect(adjustBtn.exists()).toBe(true);
    });

    it('shows adjustment trigger button for Admin on any active episodic card', () => {
      authStore.user = { id: 'admin-1', email: 'admin@example.com', username: 'admin', role: 'admin' };
      const entry = makeSeriesEntry({ userId: 'other-user', status: 'checking' });
      const wrapper = mount(WaitlistCard, { props: { entry } });

      const adjustBtn = wrapper.find('[data-testid="adjust-target-btn"]');
      expect(adjustBtn.exists()).toBe(true);
    });

    it('hides adjustment trigger button for co-requesters/non-owners when not Admin', () => {
      authStore.user = { id: 'other-user', email: 'other@example.com', username: 'other', role: 'user' };
      const entry = makeSeriesEntry({ userId: 'user-owner', status: 'pending_release' });
      const wrapper = mount(WaitlistCard, { props: { entry } });

      const adjustBtn = wrapper.find('[data-testid="adjust-target-btn"]');
      expect(adjustBtn.exists()).toBe(false);
    });

    it('hides adjustment trigger button on archived entries (completed, cancelled, rejected)', () => {
      const completedEntry = makeSeriesEntry({ status: 'completed' });
      const wrapperCompleted = mount(WaitlistCard, { props: { entry: completedEntry } });
      expect(wrapperCompleted.find('[data-testid="adjust-target-btn"]').exists()).toBe(false);

      const cancelledEntry = makeSeriesEntry({ status: 'cancelled' });
      const wrapperCancelled = mount(WaitlistCard, { props: { entry: cancelledEntry } });
      expect(wrapperCancelled.find('[data-testid="adjust-target-btn"]').exists()).toBe(false);

      const rejectedEntry = makeSeriesEntry({ status: 'rejected' });
      const wrapperRejected = mount(WaitlistCard, { props: { entry: rejectedEntry } });
      expect(wrapperRejected.find('[data-testid="adjust-target-btn"]').exists()).toBe(false);
    });
  });

  describe('WaitlistEpisodeAdjustPopover component', () => {
    it('prefills current season/episode and supports single episode vs season pack toggle', async () => {
      const entry = makeSeriesEntry({ seasonNumber: 2, targetEpisode: 3 });
      const wrapper = mount(WaitlistEpisodeAdjustPopover, {
        props: { open: true, entry },
      });

      const seasonInput = wrapper.find<HTMLInputElement>('[data-testid="adjust-season-input"]');
      const episodeInput = wrapper.find<HTMLInputElement>('[data-testid="adjust-episode-input"]');
      const packToggle = wrapper.find<HTMLInputElement>('[data-testid="adjust-season-pack-toggle"]');

      expect(seasonInput.element.value).toBe('2');
      expect(episodeInput.element.value).toBe('3');
      expect(packToggle.element.checked).toBe(false);

      // Toggle to Season Pack
      await packToggle.setValue(true);
      expect(wrapper.find('[data-testid="adjust-episode-input"]').exists()).toBe(false);
    });

    it('validates season and episode inputs before allowing save', async () => {
      const entry = makeSeriesEntry({ seasonNumber: 2, targetEpisode: 3 });
      const wrapper = mount(WaitlistEpisodeAdjustPopover, {
        props: { open: true, entry },
      });

      const seasonInput = wrapper.find('[data-testid="adjust-season-input"]');
      const saveBtn = wrapper.find<HTMLButtonElement>('[data-testid="popover-save-btn"]');

      // Invalid season < 1
      await seasonInput.setValue(0);
      expect(saveBtn.element.disabled).toBe(true);

      await seasonInput.setValue(3);
      expect(saveBtn.element.disabled).toBe(false);
    });

    it('submits updateTarget and emits saved on success', async () => {
      const entry = makeSeriesEntry({ id: 'sev-1', seasonNumber: 2, targetEpisode: 3 });
      const updatedEntry = {
        ...entry,
        seasonNumber: 2,
        targetEpisode: 4,
        tmdbReleaseDate: '2026-11-25',
        status: 'pending_release' as const,
      };

      vi.mocked(api.patch).mockResolvedValue({ ok: true, entry: updatedEntry } as any);

      const wrapper = mount(WaitlistEpisodeAdjustPopover, {
        props: { open: true, entry },
      });

      const episodeInput = wrapper.find('[data-testid="adjust-episode-input"]');
      await episodeInput.setValue(4);

      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      expect(api.patch).toHaveBeenCalledWith('/waitlist/sev-1', {
        seasonNumber: 2,
        targetEpisode: 4,
      });

      expect(wrapper.emitted('saved')).toBeTruthy();
      expect(wrapper.emitted('saved')![0][0]).toEqual(updatedEntry);
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('Integration & Reactive Re-tiering in WaitlistView', () => {
    it('reactively shifts an entry from released to upcoming upon updating target episode', async () => {
      // Entry originally aired in past (Released — Searching)
      const entry = makeSeriesEntry({
        id: 'entry-retier',
        userId: 'user-owner',
        seasonNumber: 2,
        targetEpisode: 1,
        status: 'checking',
        tmdbReleaseDate: '2025-01-01',
      });

      vi.mocked(api.get).mockResolvedValue({ entries: [entry] } as any);

      const updatedFutureEntry = {
        ...entry,
        seasonNumber: 2,
        targetEpisode: 2,
        status: 'pending_release' as const,
        tmdbReleaseDate: '2099-01-01', // Future air date -> Upcoming — Scheduled tier
      };
      vi.mocked(api.patch).mockResolvedValue({ ok: true, entry: updatedFutureEntry } as any);

      const wrapper = mount(WaitlistView, { attachTo: document.body });
      await flushPromises();

      // Initially in released tier
      expect(wrapper.find('[data-testid="tier-badge-released"]').text()).toBe('1');
      expect(wrapper.find('[data-testid="tier-badge-upcoming"]').text()).toBe('0');

      // Click adjust button to open popover
      const adjustBtn = wrapper.find('[data-testid="adjust-target-btn"]');
      expect(adjustBtn.exists()).toBe(true);
      await adjustBtn.trigger('click');
      await flushPromises();

      const popover = wrapper.find('[data-testid="episode-adjust-popover"]');
      expect(popover.exists()).toBe(true);

      // Change target episode to 2
      const episodeInput = popover.find('[data-testid="adjust-episode-input"]');
      await episodeInput.setValue(2);
      await popover.find('form').trigger('submit.prevent');
      await flushPromises();

      // Reactive re-tiering should now place the card into 'upcoming' tier
      expect(wrapper.find('[data-testid="tier-badge-released"]').text()).toBe('0');
      expect(wrapper.find('[data-testid="tier-badge-upcoming"]').text()).toBe('1');
    });
  });
});
