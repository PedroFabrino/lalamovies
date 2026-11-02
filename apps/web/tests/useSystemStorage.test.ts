import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { formatStorageCapacity, useSystemStorage, resetStorageState } from '../src/composables/useSystemStorage';
import Sidebar from '../src/components/layout/Sidebar.vue';
import { api } from '../src/lib/api';

vi.mock('../src/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => ({ path: '/dashboard' }),
    useRouter: () => ({ push: vi.fn() }),
  };
});

describe('useSystemStorage & Sidebar storage indicator (#252)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetStorageState();
    vi.clearAllMocks();
  });

  describe('formatStorageCapacity', () => {
    it('formats 0 and negative values as 0GB', () => {
      expect(formatStorageCapacity(0)).toBe('0GB');
      expect(formatStorageCapacity(-5)).toBe('0GB');
    });

    it('formats gigabytes (< 1000 GB)', () => {
      expect(formatStorageCapacity(150)).toBe('150GB');
      expect(formatStorageCapacity(92.4)).toBe('92.4GB');
      expect(formatStorageCapacity(5.5)).toBe('5.5GB');
    });

    it('formats terabytes (>= 1000 GB)', () => {
      expect(formatStorageCapacity(20480)).toBe('20TB');
      expect(formatStorageCapacity(12697.6)).toBe('12.4TB');
      expect(formatStorageCapacity(1024)).toBe('1TB');
    });
  });

  describe('useSystemStorage composable', () => {
    it('fetches storage from /system/storage successfully', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        storageQuotaGb: 20480,
        storageFootprintGb: 12697.6,
        quotaUsedPercent: 62,
        percentFree: 38,
        percentUsed: 62,
      });

      const {
        storageInfo,
        fetchStorage,
        storagePercent,
        formattedFootprint,
        formattedQuota,
        storageBarColor,
        storagePercentTextClass,
      } = useSystemStorage();

      await fetchStorage(true);

      expect(api.get).toHaveBeenCalledWith('/system/storage');
      expect(storageInfo.value?.storageQuotaGb).toBe(20480);
      expect(storagePercent.value).toBe(62);
      expect(formattedFootprint.value).toBe('12.4TB');
      expect(formattedQuota.value).toBe('20TB');
      expect(storageBarColor.value).toContain('from-accent-indigo');
      expect(storagePercentTextClass.value).toBe('text-zinc-400');
    });

    it('falls back to /admin/disk when /system/storage fails', async () => {
      vi.mocked(api.get)
        .mockRejectedValueOnce(new Error('404 Not Found'))
        .mockResolvedValueOnce({
          storageQuotaGb: 150,
          storageFootprintGb: 92.4,
          quotaUsedPercent: 62,
          percentFree: 38,
          percentUsed: 62,
        });

      const {
        fetchStorage,
        storagePercent,
        formattedFootprint,
        formattedQuota,
      } = useSystemStorage();

      await fetchStorage(true);

      expect(api.get).toHaveBeenCalledWith('/system/storage');
      expect(api.get).toHaveBeenCalledWith('/admin/disk');
      expect(storagePercent.value).toBe(62);
      expect(formattedFootprint.value).toBe('92.4GB');
      expect(formattedQuota.value).toBe('150GB');
    });

    it('adjusts warning styles when quota approaches full', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        storageQuotaGb: 100,
        storageFootprintGb: 85,
        quotaUsedPercent: 85,
        percentFree: 15,
        percentUsed: 85,
      });

      const { fetchStorage, storageBarColor, storagePercentTextClass } = useSystemStorage();
      await fetchStorage(true);

      expect(storageBarColor.value).toBe('bg-amber-500');
      expect(storagePercentTextClass.value).toContain('text-amber-400');

      vi.mocked(api.get).mockResolvedValueOnce({
        storageQuotaGb: 100,
        storageFootprintGb: 95,
        quotaUsedPercent: 95,
        percentFree: 5,
        percentUsed: 95,
      });

      await fetchStorage(true);
      expect(storageBarColor.value).toBe('bg-rose-500');
      expect(storagePercentTextClass.value).toContain('text-rose-400');
    });
  });

  describe('Sidebar rendering live storage indicator', () => {
    it('renders live storage values when open and storage is loaded', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        storageQuotaGb: 20480,
        storageFootprintGb: 12697.6,
        quotaUsedPercent: 62,
        percentFree: 38,
        percentUsed: 62,
      });

      const wrapper = mount(Sidebar, {
        props: {
          collapsed: false,
          mobileOpen: false,
        },
        global: {
          stubs: ['router-link'],
        },
      });

      // Wait for fetchStorage tick
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(wrapper.text()).toContain('Storage');
      expect(wrapper.text()).toContain('62%');
      expect(wrapper.text()).toContain('12.4TB / 20TB');
    });

    it('hides storage footprint when sidebar is collapsed', () => {
      const wrapper = mount(Sidebar, {
        props: {
          collapsed: true,
          mobileOpen: false,
        },
        global: {
          stubs: ['router-link'],
        },
      });

      expect(wrapper.text()).not.toContain('Storage');
      expect(wrapper.text()).not.toContain('12.4TB / 20TB');
    });
  });
});
