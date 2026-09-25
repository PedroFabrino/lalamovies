import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import SeasonPackEpisodesDrawer, { RequestEpisode } from '../src/components/requests/SeasonPackEpisodesDrawer.vue';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('SeasonPackEpisodesDrawer.vue', () => {
  const sampleEpisodes: RequestEpisode[] = [
    {
      id: 'ep-1',
      requestId: 'req-1',
      seasonNumber: 1,
      episodeNumber: 1,
      fileIndex: 0,
      relativePath: 'Breaking.Bad.S01E01.mkv',
      jellyfinPath: '/media/shows/Breaking Bad/Season 01/S01E01.mkv',
      sizeBytes: 1024 * 1024 * 500, // 500 MB
      status: 'downloaded',
      keepFlag: false,
      lastPlayedAt: '2026-09-20T14:30:00Z',
      prunedAt: null,
    },
    {
      id: 'ep-2',
      requestId: 'req-1',
      seasonNumber: 1,
      episodeNumber: 2,
      fileIndex: 1,
      relativePath: 'Breaking.Bad.S01E02.mkv',
      jellyfinPath: '/media/shows/Breaking Bad/Season 01/S01E02.mkv',
      sizeBytes: 1024 * 1024 * 600, // 600 MB
      status: 'downloaded',
      keepFlag: true,
      lastPlayedAt: null,
      prunedAt: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders episode list with sizes and play history', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ episodes: sampleEpisodes });

    const wrapper = mount(SeasonPackEpisodesDrawer, {
      props: {
        requestId: 'req-1',
        mediaTitle: 'Breaking Bad',
        isAdmin: true,
      },
    });

    // Check loading state
    expect(wrapper.find('[data-testid="episodes-loading"]').exists()).toBe(true);

    await flushPromises();

    expect(wrapper.find('[data-testid="episodes-loading"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Breaking Bad — Episodes');
    expect(wrapper.text()).toContain('2 episodes');

    // Check S01E01 row
    const ep1Row = wrapper.find('[data-testid="episode-row-ep-1"]');
    expect(ep1Row.exists()).toBe(true);
    expect(ep1Row.text()).toContain('S01E01');
    expect(ep1Row.text()).toContain('Breaking.Bad.S01E01.mkv');
    expect(ep1Row.text()).toContain('500.0 MB');
    expect(ep1Row.text()).toContain('Watched');

    // Check S01E02 row
    const ep2Row = wrapper.find('[data-testid="episode-row-ep-2"]');
    expect(ep2Row.exists()).toBe(true);
    expect(ep2Row.text()).toContain('S01E02');
    expect(ep2Row.text()).toContain('600.0 MB');
    expect(ep2Row.text()).toContain('Unwatched');
  });

  it('toggles per-episode keep flag when clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ episodes: sampleEpisodes });
    vi.mocked(api.patch).mockResolvedValueOnce({
      episode: { ...sampleEpisodes[0], keepFlag: true },
    });

    const wrapper = mount(SeasonPackEpisodesDrawer, {
      props: {
        requestId: 'req-1',
        isAdmin: true,
      },
    });

    await flushPromises();

    const toggleBtn = wrapper.find('[data-testid="toggle-keep-ep-ep-1"]');
    expect(toggleBtn.exists()).toBe(true);

    await toggleBtn.trigger('click');

    expect(api.patch).toHaveBeenCalledWith('/requests/req-1/episodes/ep-1/keep');
    await flushPromises();

    expect(sampleEpisodes[0].keepFlag).toBe(true);
  });

  it('prompts confirmation modal and prunes episode on confirmation', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ episodes: sampleEpisodes });
    vi.mocked(api.delete).mockResolvedValueOnce({
      ok: true,
      result: { success: true, freedBytes: 1024 * 1024 * 500, wholeRequestDeleted: false },
    });

    const wrapper = mount(SeasonPackEpisodesDrawer, {
      props: {
        requestId: 'req-1',
        isAdmin: true,
      },
    });

    await flushPromises();

    const pruneBtn = wrapper.find('[data-testid="prune-ep-ep-1"]');
    expect(pruneBtn.exists()).toBe(true);

    await pruneBtn.trigger('click');

    // Confirm modal should appear
    const modal = wrapper.find('[data-testid="confirm-prune-modal"]');
    expect(modal.exists()).toBe(true);
    expect(modal.text()).toContain('Prune Episode S01E01?');

    // Click confirm
    const confirmBtn = wrapper.find('[data-testid="execute-prune-btn"]');
    await confirmBtn.trigger('click');

    expect(api.delete).toHaveBeenCalledWith('/requests/req-1/episodes/ep-1');
    await flushPromises();

    expect(wrapper.emitted('episodePruned')).toBeTruthy();
    expect(wrapper.emitted('episodePruned')![0]).toEqual([
      { episodeId: 'ep-1', wholeRequestDeleted: false },
    ]);
  });

  it('emits close event when close button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ episodes: [] });

    const wrapper = mount(SeasonPackEpisodesDrawer, {
      props: {
        requestId: 'req-1',
        isAdmin: true,
      },
    });

    await flushPromises();

    await wrapper.find('[data-testid="close-episodes-drawer-btn"]').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
