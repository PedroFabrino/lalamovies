import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AdminCleanupTab from '../src/components/admin/AdminCleanupTab.vue';
import type { DownloadRequest } from '../src/stores/requests';

// Stub child component
vi.mock('../src/components/requests/SeasonPackEpisodesDrawer.vue', () => ({
  default: {
    name: 'SeasonPackEpisodesDrawer',
    template: '<div data-testid="stubbed-season-pack-drawer">SeasonPackEpisodesDrawer Stub</div>',
    props: ['requestId', 'mediaTitle', 'isAdmin'],
    emits: ['close', 'episodePruned'],
  },
}));

describe('AdminCleanupTab - Episode Pruning in Candidates', () => {
  const mockCandidates: DownloadRequest[] = [
    {
      id: 'req-season-pack',
      title: 'Severance',
      mediaType: 'tv_show',
      seasonNumber: 1,
      episodeNumber: null,
      sizeBytes: 15 * 1024 * 1024 * 1024,
      status: 'seeding',
      progress: 1,
      createdAt: '2026-09-01T00:00:00Z',
      isFullyConsumed: true,
      lastPlayedAt: '2026-09-10T12:00:00Z',
      requestedBy: { id: 'user-1', username: 'alice' },
    } as unknown as DownloadRequest,
    {
      id: 'req-movie',
      title: 'Inception',
      mediaType: 'movie',
      seasonNumber: null,
      episodeNumber: null,
      sizeBytes: 8 * 1024 * 1024 * 1024,
      status: 'seeding',
      progress: 1,
      createdAt: '2026-09-01T00:00:00Z',
      isFullyConsumed: false,
      lastPlayedAt: null,
      requestedBy: { id: 'user-2', username: 'bob' },
    } as unknown as DownloadRequest,
  ];

  const defaultProps = {
    diskInfo: null,
    isRunningScan: false,
    scanFeedback: null,
    candidatesList: mockCandidates,
    isLoadingCandidates: false,
    formatMediaType: (type: string) => type,
    formatMediaSubtitle: () => '',
    formatDate: (d: string) => d,
    formatSpeed: (b: number) => `${b} B`,
  };

  it('renders "Episodes" button only for season pack candidates', () => {
    const wrapper = mount(AdminCleanupTab, {
      props: defaultProps,
    });

    const spEpisodesBtn = wrapper.find('[data-testid="toggle-episodes-req-season-pack"]');
    expect(spEpisodesBtn.exists()).toBe(true);
    expect(spEpisodesBtn.text()).toContain('Episodes');

    const movieEpisodesBtn = wrapper.find('[data-testid="toggle-episodes-req-movie"]');
    expect(movieEpisodesBtn.exists()).toBe(false);
  });

  it('toggles SeasonPackEpisodesDrawer when Episodes button is clicked', async () => {
    const wrapper = mount(AdminCleanupTab, {
      props: defaultProps,
    });

    expect(wrapper.find('[data-testid="stubbed-season-pack-drawer"]').exists()).toBe(false);

    const btn = wrapper.find('[data-testid="toggle-episodes-req-season-pack"]');
    await btn.trigger('click');

    expect(wrapper.find('[data-testid="stubbed-season-pack-drawer"]').exists()).toBe(true);
    expect(btn.text()).toContain('Hide Episodes');

    await btn.trigger('click');
    expect(wrapper.find('[data-testid="stubbed-season-pack-drawer"]').exists()).toBe(false);
    expect(btn.text()).toContain('Episodes');
  });
});
