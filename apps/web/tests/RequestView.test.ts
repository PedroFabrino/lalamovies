import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import RequestView from '../src/views/RequestView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';

const mockRouterPush = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
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

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(msg: string, public statusCode = 500) {
      super(msg);
    }
  },
}));

describe('RequestView - Candidate Explorer UI', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ isConfigured: true, isReachable: true });
  });

  it('expands candidate explorer, selects alternative release, and submits updated payload', async () => {
    let submittedPayload: Record<string, any> | null = null;

    vi.mocked(api.post).mockImplementation(async (endpoint: string, body?: any) => {
      if (endpoint === '/requests/search-metadata') {
        return {
          candidates: [
            {
              id: '101',
              source: 'tmdb',
              title: 'Inception',
              year: 2010,
              overview: 'A thief who steals corporate secrets...',
              posterUrl: null,
            },
          ],
        } as any;
      }
      if (endpoint === '/requests/search-releases') {
        return {
          recommended: {
            guid: 'rel-rec',
            title: 'Inception.2010.1080p.BluRay.x264',
            sizeBytes: 3 * 1024 * 1024 * 1024,
            formattedSize: '3.0 GB',
            seeders: 50,
            leechers: 5,
            downloadUrl: 'magnet:?xt=urn:btih:rec',
            indexer: '1337x',
            resolution: '1080p',
            codec: 'x264',
            source: 'bluray',
            score: 150,
            isLowHealth: false,
          },
          candidates: [
            {
              guid: 'rel-rec',
              title: 'Inception.2010.1080p.BluRay.x264',
              sizeBytes: 3 * 1024 * 1024 * 1024,
              formattedSize: '3.0 GB',
              seeders: 50,
              leechers: 5,
              downloadUrl: 'magnet:?xt=urn:btih:rec',
              indexer: '1337x',
              resolution: '1080p',
              codec: 'x264',
              source: 'bluray',
              score: 150,
              isLowHealth: false,
            },
            {
              guid: 'rel-alt',
              title: 'Inception.2010.720p.HDTV.x264',
              sizeBytes: 1 * 1024 * 1024 * 1024,
              formattedSize: '1.0 GB',
              seeders: 80,
              leechers: 10,
              downloadUrl: 'magnet:?xt=urn:btih:alt',
              indexer: 'Nyaa',
              resolution: '720p',
              codec: 'x264',
              source: 'hdtv',
              score: 90,
              isLowHealth: false,
            },
          ],
          totalFound: 2,
          isConfigured: true,
        } as any;
      }
      if (endpoint === '/requests') {
        submittedPayload = body;
        return {
          request: {
            id: 'req-1',
            status: 'downloading',
            title: 'Inception',
          },
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(RequestView);

    // 1. Enter query and submit Step 1
    const queryInput = wrapper.find('#customQuery');
    await queryInput.setValue('Inception');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // 2. Now on Step 2: click candidate card to select and advance to Step 3
    expect(wrapper.text()).toContain('Select Metadata Match');
    const candidateCard = wrapper.find('.group');
    expect(candidateCard.exists()).toBe(true);
    await candidateCard.trigger('click');
    await flushPromises();

    // 3. Now on Step 3: check recommended release card
    expect(wrapper.text()).toContain('Confirm Download Request');
    expect(wrapper.text()).toContain('Recommended Release');
    expect(wrapper.text()).toContain('Inception.2010.1080p.BluRay.x264');

    // Candidate explorer is initially collapsed
    expect(wrapper.find('[data-testid="explorer-drawer"]').exists()).toBe(false);

    // Click to toggle explorer drawer open
    const toggleBtn = wrapper.find('[data-testid="toggle-explorer"]');
    expect(toggleBtn.exists()).toBe(true);
    await toggleBtn.trigger('click');
    await flushPromises();

    // Explorer drawer is now open
    const drawer = wrapper.find('[data-testid="explorer-drawer"]');
    expect(drawer.exists()).toBe(true);
    expect(drawer.text()).toContain('Inception.2010.720p.HDTV.x264');

    // Click the alternate candidate release
    const altCandidateItem = wrapper.find('[data-testid="candidate-item-rel-alt"]');
    expect(altCandidateItem.exists()).toBe(true);
    await altCandidateItem.trigger('click');
    await flushPromises();

    // Verify active selection is now the custom selection
    expect(wrapper.text()).toContain('Custom Selected Release');
    expect(wrapper.text()).toContain('Inception.2010.720p.HDTV.x264');

    // Click confirm & download button
    const confirmButtons = wrapper.findAll('button');
    const confirmBtn = confirmButtons.find((b) => b.text().includes('Confirm & Download'));
    expect(confirmBtn).toBeDefined();
    await confirmBtn!.trigger('click');
    await flushPromises();

    // Verify submitted payload matches the chosen alternative release
    expect(submittedPayload).not.toBeNull();
    expect(submittedPayload!.magnetLink).toBe('magnet:?xt=urn:btih:alt');
    expect(submittedPayload!.title).toBe('Inception');
  });

  it('displays low-health warning alert when all releases have seeders < 5 and allows toggling to show anyway', async () => {
    vi.mocked(api.get).mockResolvedValue({ isConfigured: true, isReachable: true });

    vi.mocked(api.post).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/requests/search-metadata') {
        return {
          candidates: [
            {
              id: '202',
              source: 'tmdb',
              title: 'Obscure Indie Movie',
              year: 2005,
              overview: 'Rare film...',
              posterUrl: null,
            },
          ],
        } as any;
      }
      if (endpoint === '/requests/search-releases') {
        return {
          recommended: null,
          candidates: [
            {
              guid: 'rel-low1',
              title: 'Obscure.Indie.Movie.2005.1080p',
              sizeBytes: 2 * 1024 * 1024 * 1024,
              formattedSize: '2.0 GB',
              seeders: 2,
              leechers: 1,
              downloadUrl: 'magnet:?xt=urn:btih:low1',
              indexer: '1337x',
              resolution: '1080p',
              codec: 'x264',
              source: 'web',
              score: 50,
              isLowHealth: true,
            },
          ],
          totalFound: 1,
          isConfigured: true,
          isReachable: true,
          hasHealthyReleases: false,
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(RequestView);

    // Advance Step 1 -> Step 2
    const queryInput = wrapper.find('#customQuery');
    await queryInput.setValue('Obscure Indie Movie');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // Advance Step 2 -> Step 3
    const candidateCard = wrapper.find('.group');
    await candidateCard.trigger('click');
    await flushPromises();

    // Confirm Low-Health Warning is rendered and Recommended Release is NOT
    expect(wrapper.find('[data-testid="low-health-warning"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('No Healthy Releases Found (All < 5 seeders)');
    expect(wrapper.text()).not.toContain('Recommended Release');

    // Toggle "Show low-health releases anyway"
    const toggleLowHealthBtn = wrapper.find('[data-testid="toggle-low-health-anyway"]');
    expect(toggleLowHealthBtn.exists()).toBe(true);
    await toggleLowHealthBtn.trigger('click');
    await flushPromises();

    // Explorer drawer toggle is now available
    const toggleExplorerBtn = wrapper.find('[data-testid="toggle-explorer"]');
    expect(toggleExplorerBtn.exists()).toBe(true);
    await toggleExplorerBtn.trigger('click');
    await flushPromises();

    // Explorer drawer contains the sub-threshold release with warning badge
    const drawer = wrapper.find('[data-testid="explorer-drawer"]');
    expect(drawer.exists()).toBe(true);
    expect(drawer.text()).toContain('Obscure.Indie.Movie.2005.1080p');
    expect(drawer.text()).toContain('2 seeders');

    // User can select the low-health candidate
    const lowCandidateItem = wrapper.find('[data-testid="candidate-item-rel-low1"]');
    await lowCandidateItem.trigger('click');
    await flushPromises();

    // Selection is now active
    expect(wrapper.text()).toContain('Custom Selected Release');
    expect(wrapper.text()).toContain('Obscure.Indie.Movie.2005.1080p');
  });

  it('switches to manual upload in Step 3, preserving confirmed metadata', async () => {
    let submittedPayload: Record<string, any> | null = null;
    vi.mocked(api.get).mockResolvedValue({ isConfigured: true, isReachable: true });

    vi.mocked(api.post).mockImplementation(async (endpoint: string, body?: any) => {
      if (endpoint === '/requests/search-metadata') {
        return {
          candidates: [
            {
              id: '303',
              source: 'tmdb',
              title: 'Interstellar',
              year: 2014,
              overview: 'Space journey...',
              posterUrl: null,
            },
          ],
        } as any;
      }
      if (endpoint === '/requests/search-releases') {
        return {
          recommended: null,
          candidates: [],
          totalFound: 0,
          isConfigured: true,
          isReachable: true,
          hasHealthyReleases: false,
        } as any;
      }
      if (endpoint === '/requests') {
        submittedPayload = body;
        return {
          request: {
            id: 'req-303',
            status: 'downloading',
            title: 'Interstellar',
          },
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(RequestView);

    // Step 1 -> Step 2
    const queryInput = wrapper.find('#customQuery');
    await queryInput.setValue('Interstellar');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // Step 2 -> Step 3
    const candidateCard = wrapper.find('.group');
    await candidateCard.trigger('click');
    await flushPromises();

    // No releases found alert is visible
    expect(wrapper.find('[data-testid="no-releases-alert"]').exists()).toBe(true);

    // Click 1-click "Switch to Manual Upload"
    const fallbackBtn = wrapper.find('[data-testid="switch-to-manual-upload-noreleases"]');
    expect(fallbackBtn.exists()).toBe(true);
    await fallbackBtn.trigger('click');
    await flushPromises();

    // Verify Step 3 In-Place Fallback Card is rendered
    expect(wrapper.find('[data-testid="step3-manual-fallback"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Metadata Preserved');
    expect(wrapper.text()).toContain('Interstellar');

    // Input manual magnet link
    const magnetInput = wrapper.find('[data-testid="step3-fallback-magnet-input"]');
    expect(magnetInput.exists()).toBe(true);
    await magnetInput.setValue('magnet:?xt=urn:btih:manualhash12345');
    await flushPromises();

    // Submit request
    const confirmButtons = wrapper.findAll('button');
    const confirmBtn = confirmButtons.find((b) => b.text().includes('Confirm & Download'));
    expect(confirmBtn).toBeDefined();
    await confirmBtn!.trigger('click');
    await flushPromises();

    // Check payload preserves confirmed metadata and attaches manual magnet link
    expect(submittedPayload).not.toBeNull();
    expect(submittedPayload!.title).toBe('Interstellar');
    expect(submittedPayload!.metadataId).toBe('303');
    expect(submittedPayload!.metadataSource).toBe('tmdb');
    expect(submittedPayload!.year).toBe(2014);
    expect(submittedPayload!.magnetLink).toBe('magnet:?xt=urn:btih:manualhash12345');
  });

  it('renders next season waitlist checkbox for TV season packs and includes waitlistNextSeason in payload', async () => {
    let submittedPayload: Record<string, any> | null = null;

    vi.mocked(api.post).mockImplementation(async (endpoint: string, body?: any) => {
      if (endpoint === '/requests/search-metadata') {
        return {
          candidates: [
            {
              id: '404',
              source: 'tmdb',
              title: 'Succession',
              year: 2018,
              overview: 'The Roy family is known for controlling the biggest media and entertainment company...',
              posterUrl: null,
            },
          ],
        } as any;
      }
      if (endpoint === '/requests/search-releases') {
        return {
          recommended: {
            guid: 'rel-season-1',
            title: 'Succession.S01.1080p.BluRay.x264',
            sizeBytes: 15 * 1024 * 1024 * 1024,
            formattedSize: '15.0 GB',
            seeders: 45,
            leechers: 2,
            downloadUrl: 'magnet:?xt=urn:btih:succession-s1',
            indexer: '1337x',
            resolution: '1080p',
            codec: 'x264',
            source: 'bluray',
            score: 160,
            isLowHealth: false,
          },
          candidates: [],
          isConfigured: true,
          isReachable: true,
          hasHealthyReleases: true,
        } as any;
      }
      if (endpoint === '/requests') {
        submittedPayload = body;
        return {
          request: {
            id: 'req-404',
            status: 'downloading',
            title: 'Succession',
          },
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(RequestView);

    // Switch media type to TV Show
    const tvRadio = wrapper.find('input[type="radio"][value="tv_show"]');
    await tvRadio.setValue();

    // Enter query and submit
    const queryInput = wrapper.find('#customQuery');
    await queryInput.setValue('Succession');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // Select candidate
    const candidateCard = wrapper.find('.group');
    await candidateCard.trigger('click');
    await flushPromises();

    // Verify next season waitlist checkbox exists and is visible
    const nextSeasonCheckbox = wrapper.find('[data-testid="waitlist-next-season-checkbox"]');
    expect(nextSeasonCheckbox.exists()).toBe(true);

    // Check the box
    await nextSeasonCheckbox.setValue(true);

    // Submit request
    const confirmButtons = wrapper.findAll('button');
    const confirmBtn = confirmButtons.find((b) => b.text().includes('Confirm & Download'));
    expect(confirmBtn).toBeDefined();
    await confirmBtn!.trigger('click');
    await flushPromises();

    expect(submittedPayload).not.toBeNull();
    expect(submittedPayload!.title).toBe('Succession');
    expect(submittedPayload!.waitlistNextSeason).toBe(true);
  });

  it('renders "Add to Waitlist instead" banner when no releases found and navigates to /waitlist with prefill', async () => {
    vi.mocked(api.post).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/requests/search-metadata') {
        return {
          candidates: [
            {
              id: '505',
              source: 'tmdb',
              title: 'Dune: Part Three',
              year: 2027,
              overview: 'Future sequel to Dune Messiah...',
              posterUrl: 'https://image.tmdb.org/t/p/w500/dune3.jpg',
            },
          ],
        } as any;
      }
      if (endpoint === '/requests/search-releases') {
        return {
          recommended: null,
          candidates: [],
          isConfigured: true,
          isReachable: true,
          hasHealthyReleases: false,
        } as any;
      }
      return {} as any;
    });

    const wrapper = mount(RequestView);

    // Search Dune: Part Three
    const queryInput = wrapper.find('#customQuery');
    await queryInput.setValue('Dune: Part Three');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // Select candidate
    const candidateCard = wrapper.find('.group');
    await candidateCard.trigger('click');
    await flushPromises();

    // Verify "No releases found automatically" alert is present
    expect(wrapper.find('[data-testid="no-releases-alert"]').exists()).toBe(true);

    // Verify "Add to Waitlist instead" banner button exists
    const waitlistBannerBtn = wrapper.find('[data-testid="add-to-waitlist-banner-btn"]');
    expect(waitlistBannerBtn.exists()).toBe(true);

    // Click banner button
    await waitlistBannerBtn.trigger('click');

    // Verify router.push called with prefilled query
    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/waitlist',
      query: {
        add: 'true',
        title: 'Dune: Part Three',
        year: '2027',
        metadataId: '505',
        metadataSource: 'tmdb',
        mediaType: 'movie',
        seasonNumber: undefined,
        posterUrl: 'https://image.tmdb.org/t/p/w500/dune3.jpg',
      },
    });
  });

  describe('Duplicate Detection & Co-Requester Confirmation (Ticket 04)', () => {
    it('detects existing request on candidate selection, shows duplicate banner, and confirms co-request', async () => {
      let searchReleasesCalled = false;
      let submittedPayload: Record<string, any> | null = null;

      vi.mocked(api.get).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/requests/exists') {
          return {
            exists: true,
            request: {
              id: 'req-dup-123',
              title: 'The Matrix',
              status: 'downloading',
              mediaType: 'movie',
              year: 1999,
            },
          } as any;
        }
        return { isConfigured: true, isReachable: true } as any;
      });

      vi.mocked(api.post).mockImplementation(async (endpoint: string, body?: any) => {
        if (endpoint === '/requests/search-metadata') {
          return {
            candidates: [
              {
                id: '603',
                source: 'tmdb',
                title: 'The Matrix',
                year: 1999,
                overview: 'A computer hacker learns...',
                posterUrl: null,
              },
            ],
          } as any;
        }
        if (endpoint === '/requests/search-releases') {
          searchReleasesCalled = true;
          return {} as any;
        }
        if (endpoint === '/requests') {
          submittedPayload = body;
          return {
            request: {
              id: 'req-dup-123',
              title: 'The Matrix',
              status: 'downloading',
            },
          } as any;
        }
        return {} as any;
      });

      const wrapper = mount(RequestView);

      // Step 1: Search
      const queryInput = wrapper.find('#customQuery');
      await queryInput.setValue('The Matrix');
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      // Step 2: Select candidate
      const candidateCard = wrapper.find('.group');
      await candidateCard.trigger('click');
      await flushPromises();

      // Step 3: Duplicate banner should be visible
      expect(wrapper.find('[data-testid="duplicate-already-exists-banner"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Already in your library — check your dashboard');
      expect(searchReleasesCalled).toBe(false);

      // Confirm button text should be "Add to My Dashboard"
      const confirmButton = wrapper.findAll('button').find((b) => b.text().includes('Add to My Dashboard'));
      expect(confirmButton).toBeDefined();
      expect(confirmButton?.attributes('disabled')).toBeUndefined();

      // Click "Add to My Dashboard"
      await confirmButton?.trigger('click');
      await flushPromises();

      expect(submittedPayload).toMatchObject({
        mediaType: 'movie',
        metadataId: '603',
        metadataSource: 'tmdb',
        title: 'The Matrix',
      });
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });

    it('proceeds normally to release searching if content does not already exist', async () => {
      let searchReleasesCalled = false;

      vi.mocked(api.get).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/requests/exists') {
          return { exists: false } as any;
        }
        return { isConfigured: true, isReachable: true } as any;
      });

      vi.mocked(api.post).mockImplementation(async (endpoint: string) => {
        if (endpoint === '/requests/search-metadata') {
          return {
            candidates: [
              {
                id: '999',
                source: 'tmdb',
                title: 'Unique Film',
                year: 2025,
                overview: 'Something unique...',
                posterUrl: null,
              },
            ],
          } as any;
        }
        if (endpoint === '/requests/search-releases') {
          searchReleasesCalled = true;
          return {
            recommended: null,
            candidates: [],
            isConfigured: true,
            isReachable: true,
            hasHealthyReleases: false,
          } as any;
        }
        return {} as any;
      });

      const wrapper = mount(RequestView);

      // Step 1: Search
      await wrapper.find('#customQuery').setValue('Unique Film');
      await wrapper.find('form').trigger('submit.prevent');
      await flushPromises();

      // Step 2: Select candidate
      await wrapper.find('.group').trigger('click');
      await flushPromises();

      // Step 3: Duplicate banner should NOT be visible
      expect(wrapper.find('[data-testid="duplicate-already-exists-banner"]').exists()).toBe(false);
      expect(searchReleasesCalled).toBe(true);
    });
  });
});
