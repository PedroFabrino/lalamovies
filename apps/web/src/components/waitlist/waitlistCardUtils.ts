import type { WaitlistEntry, WaitlistStatus } from '../../stores/waitlist';

export function getRemainingGraceMs(entry: WaitlistEntry, nowMs: number = Date.now()): number {
  if (!entry.notifyAt) return 0;
  const notifiedTime = new Date(entry.notifyAt).getTime();
  if (isNaN(notifiedTime)) return 0;
  const graceHours = entry.graceHours ?? 6;
  const graceWindowMs = graceHours * 60 * 60 * 1000;
  return Math.max(0, notifiedTime + graceWindowMs - nowMs);
}

export function formatGraceRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return '0s';
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

export function getMediaTypeIcon(type: string): string {
  switch (type) {
    case 'movie':
      return '🎬';
    case 'tv_show':
      return '📺';
    case 'anime':
      return '⛩️';
    default:
      return '📁';
  }
}

export function getMediaTypeBadgeClasses(type: string): string {
  switch (type) {
    case 'movie':
      return 'bg-blue-950/60 text-blue-300 border-blue-800/60';
    case 'tv_show':
      return 'bg-purple-950/60 text-purple-300 border-purple-800/60';
    case 'anime':
      return 'bg-pink-950/60 text-pink-300 border-pink-800/60';
    default:
      return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  }
}

interface StatusStyleConfig {
  badge: string;
  dot: string;
  label?: string;
}

const STATUS_CONFIGS: Record<WaitlistStatus, StatusStyleConfig> = {
  pending_release: {
    badge: 'bg-amber-950/50 text-amber-300 border-amber-800/50',
    dot: 'bg-amber-400',
    label: 'Pending Release',
  },
  checking: {
    badge: 'bg-sky-950/50 text-sky-300 border-sky-800/50',
    dot: 'bg-sky-400',
    label: 'Checking Trackers',
  },
  notified: {
    badge: 'bg-indigo-950/50 text-indigo-300 border-indigo-700 animate-pulse',
    dot: 'bg-indigo-400',
  },
  triggered: {
    badge: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
    dot: 'bg-emerald-400',
    label: 'Triggered',
  },
  completed: {
    badge: 'bg-teal-950/50 text-teal-300 border-teal-800/50',
    dot: 'bg-teal-400',
    label: 'Completed',
  },
  cancelled: {
    badge: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    dot: 'bg-zinc-500',
    label: 'Cancelled',
  },
  error: {
    badge: 'bg-rose-950/50 text-rose-300 border-rose-800/50',
    dot: 'bg-rose-400',
    label: 'Error',
  },
  rejected: {
    badge: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    dot: 'bg-zinc-400',
    label: 'Rejected',
  },
};

const DEFAULT_STATUS_CONFIG: StatusStyleConfig = {
  badge: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  dot: 'bg-zinc-400',
};

export function getStatusBadgeClasses(status: WaitlistStatus): string {
  return (STATUS_CONFIGS[status] || DEFAULT_STATUS_CONFIG).badge;
}

export function getStatusDotClasses(status: WaitlistStatus): string {
  return (STATUS_CONFIGS[status] || DEFAULT_STATUS_CONFIG).dot;
}

export function formatStatusText(entry: WaitlistEntry, nowMs: number = Date.now()): string {
  if (entry.status === 'notified') {
    const remainingMs = getRemainingGraceMs(entry, nowMs);
    return remainingMs <= 0
      ? 'Release Found (Queued)'
      : `Release Found (${formatGraceRemaining(remainingMs)})`;
  }
  return STATUS_CONFIGS[entry.status]?.label || entry.status;
}

export function formatDateOnly(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
      const [y, m, d] = isoString.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}
