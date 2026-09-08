import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import RequestView from '../src/views/RequestView.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
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
});
