import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { GpuMetrics, SystemMetrics } from './sessionMonitoringService';

const execAsync = promisify(exec);

let previousCpuSnapshot: { idle: number; total: number } | null = null;

export function resetCpuSnapshot(): void {
  previousCpuSnapshot = null;
}

export function calculateCpuUsage(cpus: os.CpuInfo[]): number {
  if (!cpus || cpus.length === 0) return 0;

  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    const { user, nice, sys, idle: cpuIdle, irq } = cpu.times;
    idle += cpuIdle;
    total += user + nice + sys + cpuIdle + (irq || 0);
  }

  if (!previousCpuSnapshot) {
    previousCpuSnapshot = { idle, total };
    const load = os.loadavg()[0];
    if (load && cpus.length > 0) {
      return Math.min(100, Math.max(0, Math.round((load / cpus.length) * 100)));
    }
    return 0;
  }

  const idleDelta = idle - previousCpuSnapshot.idle;
  const totalDelta = total - previousCpuSnapshot.total;
  previousCpuSnapshot = { idle, total };

  if (totalDelta <= 0) return 0;
  const usage = (1 - idleDelta / totalDelta) * 100;
  return Math.min(100, Math.max(0, Math.round(usage)));
}

export type ExecCommandFn = (cmd: string, options?: { timeout?: number }) => Promise<{ stdout: string; stderr: string }>;

export async function sampleGpuMetrics(
  execCommand: ExecCommandFn = execAsync
): Promise<GpuMetrics | null> {
  try {
    const { stdout } = await execCommand(
      'nvidia-smi --query-gpu=name,driver_version,utilization.gpu,utilization.encoder,memory.used,memory.total --format=csv,noheader,nounits',
      { timeout: 1500 }
    );

    const line = stdout.trim().split('\n')[0];
    if (!line) return null;

    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 6) return null;

    const [name, driverVersion, gpuUtilStr, encUtilStr, memUsedStr, memTotalStr] = parts;
    const utilizationGpuPercent = parseInt(gpuUtilStr, 10);
    const utilizationEncoderPercent = parseInt(encUtilStr, 10);
    const memUsedMib = parseInt(memUsedStr, 10);
    const memTotalMib = parseInt(memTotalStr, 10);

    if (
      isNaN(utilizationGpuPercent) ||
      isNaN(utilizationEncoderPercent) ||
      isNaN(memUsedMib) ||
      isNaN(memTotalMib)
    ) {
      return null;
    }

    return {
      name: name || 'NVIDIA GPU',
      driverVersion: driverVersion || undefined,
      utilizationGpuPercent,
      utilizationEncoderPercent,
      vramUsedBytes: memUsedMib * 1024 * 1024,
      vramTotalBytes: memTotalMib * 1024 * 1024,
    };
  } catch {
    return null;
  }
}

export async function collectSystemMetrics(
  execCommand?: ExecCommandFn
): Promise<SystemMetrics> {
  const cpus = os.cpus();
  const cpuPercent = calculateCpuUsage(cpus);
  const memTotalBytes = os.totalmem();
  const freeMem = os.freemem();
  const memUsedBytes = Math.max(0, memTotalBytes - freeMem);

  const gpu = await sampleGpuMetrics(execCommand);

  return {
    cpuPercent,
    cpuCores: cpus.length || 1,
    memUsedBytes,
    memTotalBytes,
    gpu,
  };
}
