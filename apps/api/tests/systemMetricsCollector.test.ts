import { describe, it, expect, beforeEach, vi } from 'vitest';
import os from 'os';
import {
  calculateCpuUsage,
  resetCpuSnapshot,
  sampleGpuMetrics,
  collectSystemMetrics,
} from '../src/services/systemMetricsCollector';
import { SessionMonitoringService } from '../src/services/sessionMonitoringService';

describe('systemMetricsCollector (Unit)', () => {
  beforeEach(() => {
    resetCpuSnapshot();
    vi.restoreAllMocks();
  });

  describe('calculateCpuUsage', () => {
    it('returns 0 or positive load fallback on first sample', () => {
      const mockCpus: os.CpuInfo[] = [
        {
          model: 'Intel Core',
          speed: 3000,
          times: { user: 100, nice: 0, sys: 50, idle: 850, irq: 0 },
        },
      ];
      const usage = calculateCpuUsage(mockCpus);
      expect(usage).toBeGreaterThanOrEqual(0);
      expect(usage).toBeLessThanOrEqual(100);
    });

    it('calculates delta CPU usage percentage across calls', () => {
      const initialCpus: os.CpuInfo[] = [
        {
          model: 'Intel Core',
          speed: 3000,
          times: { user: 100, nice: 0, sys: 50, idle: 850, irq: 0 }, // total: 1000, idle: 850
        },
      ];
      calculateCpuUsage(initialCpus);

      const nextCpus: os.CpuInfo[] = [
        {
          model: 'Intel Core',
          speed: 3000,
          times: { user: 200, nice: 0, sys: 100, idle: 900, irq: 0 }, // total: 1200, idle: 900 -> delta total: 200, delta idle: 50 -> 75%
        },
      ];
      const usage = calculateCpuUsage(nextCpus);
      expect(usage).toBe(75);
    });

    it('returns 0 when given empty cpus array', () => {
      expect(calculateCpuUsage([])).toBe(0);
    });
  });

  describe('sampleGpuMetrics', () => {
    it('parses valid nvidia-smi CSV output', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        stdout: 'NVIDIA GeForce RTX 3070, 570.86.16, 25, 10, 2048, 8192\n',
        stderr: '',
      });

      const metrics = await sampleGpuMetrics(mockExec);
      expect(metrics).not.toBeNull();
      expect(metrics?.name).toBe('NVIDIA GeForce RTX 3070');
      expect(metrics?.driverVersion).toBe('570.86.16');
      expect(metrics?.utilizationGpuPercent).toBe(25);
      expect(metrics?.utilizationEncoderPercent).toBe(10);
      expect(metrics?.vramUsedBytes).toBe(2048 * 1024 * 1024);
      expect(metrics?.vramTotalBytes).toBe(8192 * 1024 * 1024);
    });

    it('returns null if nvidia-smi command fails or throws', async () => {
      const mockExec = vi.fn().mockRejectedValue(new Error('nvidia-smi not found'));
      const metrics = await sampleGpuMetrics(mockExec);
      expect(metrics).toBeNull();
    });

    it('returns null if output is empty or malformed', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        stdout: 'Not a valid CSV line\n',
        stderr: '',
      });
      const metrics = await sampleGpuMetrics(mockExec);
      expect(metrics).toBeNull();
    });
  });

  describe('collectSystemMetrics', () => {
    it('aggregates cpu, memory, and gpu metrics', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        stdout: 'NVIDIA GeForce RTX 3070, 570.86.16, 30, 0, 1024, 8192\n',
        stderr: '',
      });

      const result = await collectSystemMetrics(mockExec);
      expect(result.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(result.cpuCores).toBeGreaterThanOrEqual(1);
      expect(result.memTotalBytes).toBeGreaterThan(0);
      expect(result.memUsedBytes).toBeGreaterThanOrEqual(0);
      expect(result.gpu).not.toBeNull();
      expect(result.gpu?.name).toBe('NVIDIA GeForce RTX 3070');
    });

    it('sets gpu: null when GPU is not present without throwing', async () => {
      const mockExec = vi.fn().mockRejectedValue(new Error('ENOENT'));

      const result = await collectSystemMetrics(mockExec);
      expect(result.gpu).toBeNull();
      expect(result.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(result.memTotalBytes).toBeGreaterThan(0);
    });
  });

  describe('SessionMonitoringService.getSystemMetrics', () => {
    it('delegates to system metrics collection', async () => {
      const service = new SessionMonitoringService();
      const metrics = await service.getSystemMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(metrics.memTotalBytes).toBeGreaterThan(0);
    });
  });
});
