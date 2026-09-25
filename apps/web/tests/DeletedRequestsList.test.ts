import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DeletedRequestsList from '../src/components/requests/DeletedRequestsList.vue';
import type { DownloadRequest } from '../src/stores/requests';

describe('DeletedRequestsList.vue', () => {
  const sampleItems: DownloadRequest[] = [
    {
      id: 'req_1',
      userId: 'usr_1',
      title: 'Inception',
      mediaType: 'movie',
      status: 'deleted',
      metadataId: '101',
      metadataSource: 'tmdb',
      requestedAt: '2026-09-01T12:00:00.000Z',
      deletedAt: '2026-09-10T15:30:00.000Z',
      deletionReason: 'cleanup',
      isActiveOrPresent: false,
    } as DownloadRequest,
    {
      id: 'req_2',
      userId: 'usr_1',
      title: 'Interstellar',
      mediaType: 'movie',
      status: 'deleted',
      metadataId: '102',
      metadataSource: 'tmdb',
      requestedAt: '2026-09-05T12:00:00.000Z',
      deletedAt: '2026-09-12T10:00:00.000Z',
      deletionReason: 'manual',
      isActiveOrPresent: true,
    } as DownloadRequest,
  ];

  it('renders empty state when items is empty', () => {
    const wrapper = mount(DeletedRequestsList, {
      props: {
        items: [],
        loading: false,
      },
    });

    expect(wrapper.text()).toContain('No Deleted Requests');
  });

  it('renders table rows for deleted items with reason badges', () => {
    const wrapper = mount(DeletedRequestsList, {
      props: {
        items: sampleItems,
        loading: false,
      },
    });

    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(2);

    expect(rows[0].text()).toContain('Inception');
    expect(rows[0].text()).toContain('Space Cleanup');

    expect(rows[1].text()).toContain('Interstellar');
    expect(rows[1].text()).toContain('Manual Delete');
  });

  it('shows active badge and disables redownload when isActiveOrPresent is true', () => {
    const wrapper = mount(DeletedRequestsList, {
      props: {
        items: sampleItems,
        loading: false,
      },
    });

    const rows = wrapper.findAll('tbody tr');
    // Row 2 is Interstellar (isActiveOrPresent = true)
    expect(rows[1].find('[data-testid="active-in-library-badge"]').exists()).toBe(true);

    const redownloadBtn = rows[1].find('[data-testid="redownload-button"]');
    expect(redownloadBtn.attributes('disabled')).toBeDefined();
  });

  it('allows clicking redownload button when isActiveOrPresent is false', async () => {
    const wrapper = mount(DeletedRequestsList, {
      props: {
        items: sampleItems,
        loading: false,
      },
    });

    const rows = wrapper.findAll('tbody tr');
    // Row 1 is Inception (isActiveOrPresent = false)
    expect(rows[0].find('[data-testid="active-in-library-badge"]').exists()).toBe(false);

    const redownloadBtn = rows[0].find('[data-testid="redownload-button"]');
    expect(redownloadBtn.attributes('disabled')).toBeUndefined();

    await redownloadBtn.trigger('click');
    expect(wrapper.emitted('redownload')).toBeTruthy();
    expect(wrapper.emitted('redownload')![0]).toEqual([sampleItems[0]]);
  });
});
