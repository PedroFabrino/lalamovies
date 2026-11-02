import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LibraryMediaCard from '../src/components/library/LibraryMediaCard.vue';
import LibraryMediaDetailsModal from '../src/components/library/LibraryMediaDetailsModal.vue';
import type { LibraryMediaItem } from '../src/components/library/types';

describe('LibraryMediaCard and Details Modal (#249)', () => {
  const mockMovie: LibraryMediaItem = {
    id: 'mov_100',
    requestIds: ['mov_100'],
    title: 'Dune: Part Two',
    year: 2024,
    mediaType: 'movie',
    sizeBytes: 8500000000,
    jellyfinPath: '/media/movies/Dune Part Two (2024)/Dune.mkv',
    backdropUrl: 'https://image.tmdb.org/t/p/original/dune-backdrop.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w500/dune-poster.jpg',
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge.',
    genres: ['Science Fiction', 'Adventure'],
    resolution: '4K HDR',
    requestedBy: { id: 'usr_alice', username: 'alice' },
    coRequesters: [],
    canManage: true,
  };

  it('renders media card with poster, title, year, and badges', () => {
    const wrapper = mount(LibraryMediaCard, {
      props: {
        item: mockMovie,
        selected: false,
        isOwned: true,
      },
    });

    expect(wrapper.text()).toContain('Dune: Part Two');
    expect(wrapper.text()).toContain('2024');
    expect(wrapper.find('[data-testid="badge-you"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="item-checkbox"]').exists()).toBe(true);
  });

  it('emits open-details when card or title is clicked', async () => {
    const wrapper = mount(LibraryMediaCard, {
      props: {
        item: mockMovie,
        selected: false,
        isOwned: true,
      },
    });

    await wrapper.find('h3').trigger('click');
    expect(wrapper.emitted('open-details')).toBeTruthy();
    expect(wrapper.emitted('open-details')?.[0]).toEqual([mockMovie]);
  });

  it('renders details modal with backdrop, stream quality selector, and Jellyfin action button', () => {
    const wrapper = mount(LibraryMediaDetailsModal, {
      props: {
        item: mockMovie,
      },
    });

    expect(wrapper.find('[data-testid="library-media-details-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Dune: Part Two');
    expect(wrapper.text()).toContain('Paul Atreides unites');
    expect(wrapper.text()).toContain('Original');
    expect(wrapper.text()).toContain('1080p');
    expect(wrapper.text()).toContain('720p');

    const jellyfinBtn = wrapper.find('[data-testid="watch-jellyfin-btn"]');
    expect(jellyfinBtn.exists()).toBe(true);
    expect(jellyfinBtn.attributes('href')).toBe('https://watch.lalamovies.stream');
  });
});
