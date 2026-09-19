import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SubtitlePickerModal from '../src/components/SubtitlePickerModal.vue';
import { api } from '../src/lib/api';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('SubtitlePickerModal.vue (#45)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('does not render when show is false', () => {
    const wrapper = mount(SubtitlePickerModal, {
      props: {
        show: false,
        requestId: 'req-1',
        title: 'Fight Club',
      },
    });

    expect(wrapper.find('[data-testid="subtitle-picker-modal"]').exists()).toBe(false);
  });

  it('renders and fetches subtitles on mount', async () => {
    (api.get as any).mockResolvedValueOnce({
      subtitles: [
        {
          fileId: 101,
          uploaderName: 'UploaderA',
          downloadCount: 4200,
          uploadDate: '2023-01-01',
          releaseName: 'Fight.Club.1999.1080p',
        },
        {
          fileId: 102,
          uploaderName: 'UploaderB',
          downloadCount: 1500,
          uploadDate: '2023-01-02',
          releaseName: 'Fight.Club.1999.720p',
        },
      ],
    });

    const wrapper = mount(SubtitlePickerModal, {
      props: {
        show: true,
        requestId: 'req-1',
        title: 'Fight Club',
      },
    });

    await vi.waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/requests/req-1/subtitles');
      expect(wrapper.findAll('[data-testid="subtitle-row"]')).toHaveLength(2);
    });

    expect(wrapper.text()).toContain('Fight.Club.1999.1080p');
    expect(wrapper.text()).toContain('@UploaderA');
    expect(wrapper.text()).toContain('4.2k');
  });

  it('shows unconfigured state when API returns 503', async () => {
    const error503 = new Error('Service unavailable');
    (error503 as any).status = 503;
    (api.get as any).mockRejectedValueOnce(error503);

    const wrapper = mount(SubtitlePickerModal, {
      props: {
        show: true,
        requestId: 'req-1',
        title: 'Fight Club',
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="not-configured-state"]').exists()).toBe(true);
    });

    expect(wrapper.text()).toContain('OpenSubtitles Not Configured');
  });

  it('shows empty state when no subtitles found', async () => {
    (api.get as any).mockResolvedValueOnce({ subtitles: [] });

    const wrapper = mount(SubtitlePickerModal, {
      props: {
        show: true,
        requestId: 'req-1',
        title: 'Fight Club',
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
    });

    expect(wrapper.text()).toContain('No Subtitles Found');
  });

  it('applies a single subtitle on row click', async () => {
    (api.get as any).mockResolvedValueOnce({
      subtitles: [
        {
          fileId: 101,
          uploaderName: 'UploaderA',
          downloadCount: 4200,
          uploadDate: '2023-01-01',
          releaseName: 'Fight.Club.1999.1080p',
        },
      ],
    });
    (api.post as any).mockResolvedValueOnce({ success: true });

    const wrapper = mount(SubtitlePickerModal, {
      props: {
        show: true,
        requestId: 'req-1',
        title: 'Fight Club',
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="apply-row-btn"]').exists()).toBe(true);
    });

    await wrapper.find('[data-testid="apply-row-btn"]').trigger('click');

    expect(api.post).toHaveBeenCalledWith('/requests/req-1/subtitles/fetch', {
      fileId: 101,
    });
    expect(wrapper.emitted('applied')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('selects multiple subtitles and clicks Apply Selected', async () => {
    (api.get as any).mockResolvedValueOnce({
      subtitles: [
        {
          fileId: 101,
          uploaderName: 'UploaderA',
          downloadCount: 4200,
          uploadDate: '2023-01-01',
          releaseName: 'Fight.Club.1999.1080p',
        },
        {
          fileId: 102,
          uploaderName: 'UploaderB',
          downloadCount: 1500,
          uploadDate: '2023-01-02',
          releaseName: 'Fight.Club.1999.720p',
        },
      ],
    });
    (api.post as any).mockResolvedValueOnce({ success: true, count: 2 });

    const wrapper = mount(SubtitlePickerModal, {
      props: {
        show: true,
        requestId: 'req-1',
        title: 'Fight Club',
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.findAll('[data-testid="subtitle-checkbox"]')).toHaveLength(2);
    });

    const checkboxes = wrapper.findAll('[data-testid="subtitle-checkbox"]');
    await checkboxes[0].setValue(true);
    await checkboxes[1].setValue(true);

    const applySelectedBtn = wrapper.find('[data-testid="apply-selected-btn"]');
    expect(applySelectedBtn.text()).toContain('Apply Selected (2)');

    await applySelectedBtn.trigger('click');

    expect(api.post).toHaveBeenCalledWith('/requests/req-1/subtitles/fetch', {
      fileIds: [101, 102],
    });
    expect(wrapper.emitted('applied')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('triggers Re-fetch Best', async () => {
    (api.get as any).mockResolvedValueOnce({ subtitles: [] });
    (api.post as any).mockResolvedValueOnce({ success: true });

    const wrapper = mount(SubtitlePickerModal, {
      props: {
        show: true,
        requestId: 'req-1',
        title: 'Fight Club',
      },
    });

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
    });

    const refetchBtn = wrapper.find('[data-testid="refetch-best-btn"]');
    await refetchBtn.trigger('click');

    expect(api.post).toHaveBeenCalledWith('/requests/req-1/subtitles/fetch', {});
    expect(wrapper.emitted('applied')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
