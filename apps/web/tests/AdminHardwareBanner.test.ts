import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AdminHardwareBanner from '../src/components/admin/AdminHardwareBanner.vue';
import type { SystemMetrics } from '../src/composables/useAdminActivity';

describe('AdminHardwareBanner.vue', () => {
  const mockSystemWithGpu: SystemMetrics = {
    cpuPercent: 45,
    cpuCores: 16,
    memUsedBytes: 12 * 1024 * 1024 * 1024,
    memTotalBytes: 32 * 1024 * 1024 * 1024,
    gpu: {
      name: 'NVIDIA GeForce RTX 3070',
      driverVersion: '570.86.16',
      utilizationGpuPercent: 28,
      utilizationEncoderPercent: 12,
      vramUsedBytes: 2500 * 1024 * 1024,
      vramTotalBytes: 8192 * 1024 * 1024,
    },
  };

  const mockSystemWithoutGpu: SystemMetrics = {
    cpuPercent: 15,
    cpuCores: 8,
    memUsedBytes: 4 * 1024 * 1024 * 1024,
    memTotalBytes: 16 * 1024 * 1024 * 1024,
    gpu: null,
  };

  it('renders nothing if system is null', () => {
    const wrapper = mount(AdminHardwareBanner, {
      props: { system: null },
    });
    expect(wrapper.text()).toBe('');
  });

  it('renders CPU and RAM telemetry meters', () => {
    const wrapper = mount(AdminHardwareBanner, {
      props: { system: mockSystemWithGpu },
    });

    expect(wrapper.text()).toContain('Host CPU');
    expect(wrapper.text()).toContain('16 Cores');
    expect(wrapper.text()).toContain('45%');

    expect(wrapper.text()).toContain('Memory (RAM)');
    expect(wrapper.text()).toContain('12.0 GB / 32.0 GB');
    expect(wrapper.text()).toContain('38%');
  });

  it('renders NVIDIA GPU telemetry meters when gpu is present', () => {
    const wrapper = mount(AdminHardwareBanner, {
      props: { system: mockSystemWithGpu },
    });

    expect(wrapper.text()).toContain('NVIDIA GeForce RTX 3070');
    expect(wrapper.text()).toContain('Driver 570.86.16');
    expect(wrapper.text()).toContain('3D Core');
    expect(wrapper.text()).toContain('28%');
    expect(wrapper.text()).toContain('NVENC Video Encoder');
    expect(wrapper.text()).toContain('12%');
    expect(wrapper.text()).toContain('VRAM (2.4 GB / 8.0 GB)');
    expect(wrapper.text()).toContain('31%');
  });

  it('omits GPU card when system.gpu is null without breaking CPU or RAM', () => {
    const wrapper = mount(AdminHardwareBanner, {
      props: { system: mockSystemWithoutGpu },
    });

    expect(wrapper.text()).toContain('Host CPU');
    expect(wrapper.text()).toContain('8 Cores');
    expect(wrapper.text()).toContain('15%');
    expect(wrapper.text()).toContain('Memory (RAM)');
    expect(wrapper.text()).toContain('4.0 GB / 16.0 GB');

    // GPU indicators should be completely absent
    expect(wrapper.text()).not.toContain('NVIDIA');
    expect(wrapper.text()).not.toContain('NVENC');
    expect(wrapper.text()).not.toContain('3D Core');
    expect(wrapper.text()).not.toContain('VRAM');
  });
});
