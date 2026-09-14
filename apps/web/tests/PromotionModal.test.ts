import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PromotionModal from '../src/components/PromotionModal.vue';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('PromotionModal.vue (#53)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 1 with media type selection', () => {
    const wrapper = mount(PromotionModal, {
      props: {
        show: true,
        stream: {
          id: 'stream-123',
          title: 'Oppenheimer 2023',
        },
      },
    });

    expect(wrapper.find('[data-testid="promotion-step-1"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Select Media Type');
    expect(wrapper.text()).toContain('Movie');
    expect(wrapper.text()).toContain('TV Show');
    expect(wrapper.text()).toContain('Anime');
  });

  it('navigates to Step 2 and searches metadata', async () => {
    (api.post as any).mockResolvedValueOnce({
      candidates: [
        {
          id: '872585',
          title: 'Oppenheimer',
          year: 2023,
          source: 'tmdb',
          posterUrl: 'https://image.tmdb.org/t/p/w500/oppenheimer.jpg',
          overview: 'The story of J. Robert Oppenheimer.',
        },
      ],
    });

    const wrapper = mount(PromotionModal, {
      props: {
        show: true,
        stream: {
          id: 'stream-123',
          title: 'Oppenheimer 2023',
        },
      },
    });

    // Step 1: Click Next
    const nextBtn = wrapper.find('[data-testid="button-step-1-next"]');
    await nextBtn.trigger('click');

    // Wait for async searchMetadata
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    // Should be in Step 2
    expect(wrapper.find('[data-testid="promotion-step-2"]').exists()).toBe(true);
    expect(api.post).toHaveBeenCalledWith('/requests/search-metadata', {
      query: 'Oppenheimer 2023',
      mediaType: 'movie',
    });

    expect(wrapper.text()).toContain('Oppenheimer');
    expect(wrapper.text()).toContain('2023');
  });

  it('completes promotion for a movie and emits promoted event', async () => {
    (api.post as any)
      .mockResolvedValueOnce({
        candidates: [
          {
            id: '872585',
            title: 'Oppenheimer',
            year: 2023,
            source: 'tmdb',
            posterUrl: null,
            overview: 'The story of J. Robert Oppenheimer.',
          },
        ],
      })
      .mockResolvedValueOnce({
        status: 'promoted',
        streamId: 'stream-123',
        requestId: 'req-promoted-888',
        jellyfinPath: '/media_data/movies/Oppenheimer (2023)/Oppenheimer (2023).mkv',
      });

    const wrapper = mount(PromotionModal, {
      props: {
        show: true,
        stream: {
          id: 'stream-123',
          title: 'Oppenheimer 2023',
        },
      },
    });

    // Step 1 -> Step 2
    await wrapper.find('[data-testid="button-step-1-next"]').trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    // In Step 2, candidate is auto-selected, click Confirm & Promote
    const confirmBtn = wrapper.find('[data-testid="button-step-2-next"]');
    await confirmBtn.trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(api.post).toHaveBeenCalledWith('/streams/stream-123/promote', {
      mediaType: 'movie',
      metadataId: '872585',
      metadataSource: 'tmdb',
      title: 'Oppenheimer',
      year: 2023,
      seasonNumber: undefined,
      episodeNumber: undefined,
    });

    expect(wrapper.find('[data-testid="promotion-success"]').exists()).toBe(true);
    expect(wrapper.emitted('promoted')).toHaveLength(1);
    expect(wrapper.emitted('promoted')![0]).toEqual([
      {
        streamId: 'stream-123',
        requestId: 'req-promoted-888',
      },
    ]);
  });
});
