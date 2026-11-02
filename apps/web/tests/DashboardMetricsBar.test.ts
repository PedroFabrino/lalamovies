import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DashboardMetricsBar from '../src/components/dashboard/DashboardMetricsBar.vue';
import { useRequestsStore } from '../src/stores/requests';

describe('DashboardMetricsBar (Ticket #247)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders zero state metrics when requests list is empty', () => {
    const wrapper = mount(DashboardMetricsBar);
    expect(wrapper.text()).toContain('Active Downloads');
    expect(wrapper.text()).toContain('Total Speed');
    expect(wrapper.text()).toContain('In Library');
    expect(wrapper.text()).toContain('Total Media');
  });

  it('computes metrics from store requests and live progress map', () => {
    const store = useRequestsStore();
    store.requests = [
      {
        id: 'req_1',
        title: 'Movie A',
        status: 'downloading',
        mediaType: 'movie',
        metadataId: '1',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
      },
      {
        id: 'req_2',
        title: 'Show B',
        status: 'queued',
        mediaType: 'tv_show',
        metadataId: '2',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
      },
      {
        id: 'req_3',
        title: 'Movie C',
        status: 'done',
        mediaType: 'movie',
        metadataId: '3',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
      },
      {
        id: 'req_4',
        title: 'Movie D',
        status: 'error',
        mediaType: 'movie',
        metadataId: '4',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
      },
    ];

    store.progressMap = {
      req_1: {
        id: 'req_1',
        progress: 0.45,
        speedBps: 15_000_000, // ~15 MB/s
        etaSeconds: 120,
      },
    };

    const wrapper = mount(DashboardMetricsBar);

    // 2 active (req_1 downloading + req_2 queued)
    expect(wrapper.text()).toContain('2');
    // 1 completed (req_3 seeding)
    expect(wrapper.text()).toContain('1');
    // 4 total
    expect(wrapper.text()).toContain('4');
    // Total speed formatted
    expect(wrapper.text()).toContain('MB/s');
  });
});
