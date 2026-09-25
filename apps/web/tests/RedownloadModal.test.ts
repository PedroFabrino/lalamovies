import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RedownloadModal from '../src/components/requests/RedownloadModal.vue';
import { useRequestsStore, type DownloadRequest } from '../src/stores/requests';

const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('RedownloadModal.vue', () => {
  const sampleItem: DownloadRequest = {
    id: 'req_del_123',
    userId: 'usr_1',
    title: 'The Matrix',
    year: 1999,
    mediaType: 'movie',
    status: 'deleted',
    metadataId: '603',
    metadataSource: 'tmdb',
    requestedAt: '2026-09-01T12:00:00.000Z',
    deletedAt: '2026-09-10T15:30:00.000Z',
    deletionReason: 'cleanup',
  } as DownloadRequest;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders modal details when open', () => {
    const wrapper = mount(RedownloadModal, {
      props: {
        show: true,
        item: sampleItem,
      },
    });

    expect(wrapper.text()).toContain('The Matrix');
    expect(wrapper.text()).toContain('Redownload Media');
    expect(wrapper.find('[data-testid="btn-use-original-source"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="btn-search-new-source"]').exists()).toBe(true);
  });

  it('triggers store redownload on Use Original Source and emits redownloaded', async () => {
    const requestsStore = useRequestsStore();
    const createdReq = { ...sampleItem, id: 'req_new_456', status: 'queued' } as DownloadRequest;
    vi.spyOn(requestsStore, 'redownload').mockResolvedValue(createdReq);

    const wrapper = mount(RedownloadModal, {
      props: {
        show: true,
        item: sampleItem,
      },
    });

    await wrapper.find('[data-testid="btn-use-original-source"]').trigger('click');
    await flushPromises();

    expect(requestsStore.redownload).toHaveBeenCalledWith('req_del_123');
    expect(wrapper.emitted('redownloaded')).toBeTruthy();
    expect(wrapper.emitted('redownloaded')![0]).toEqual([createdReq]);
  });

  it('navigates to /request with pre-filled query on Search New Source', async () => {
    const wrapper = mount(RedownloadModal, {
      props: {
        show: true,
        item: sampleItem,
      },
    });

    await wrapper.find('[data-testid="btn-search-new-source"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith({
      path: '/request',
      query: {
        title: 'The Matrix',
        mediaType: 'movie',
        year: '1999',
        season: undefined,
        episode: undefined,
        metadataId: '603',
        metadataSource: 'tmdb',
      },
    });
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('displays error message when redownload fails with conflict', async () => {
    const requestsStore = useRequestsStore();
    vi.spyOn(requestsStore, 'redownload').mockRejectedValue(
      new Error('Active download already exists for this title or infohash')
    );

    const wrapper = mount(RedownloadModal, {
      props: {
        show: true,
        item: sampleItem,
      },
    });

    await wrapper.find('[data-testid="btn-use-original-source"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="redownload-error-alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Active download already exists');
  });

  it('emits close event when cancel button is clicked', async () => {
    const wrapper = mount(RedownloadModal, {
      props: {
        show: true,
        item: sampleItem,
      },
    });

    const cancelBtn = wrapper.findAll('button').find((b) => b.text().includes('Cancel'));
    expect(cancelBtn).toBeDefined();
    await cancelBtn!.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
