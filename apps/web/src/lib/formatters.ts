export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s';
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0 || seconds >= 864000) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (seconds < 3600) {
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const remM = Math.floor((seconds % 3600) / 60);
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

export function formatMediaType(type: string): string {
  switch (type) {
    case 'movie':
      return 'Movie';
    case 'tv_show':
      return 'TV Show';
    case 'anime':
      return 'Anime';
    case 'private':
      return 'Private';
    default:
      return type;
  }
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatMediaSubtitle(item: {
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}): string {
  const parts: string[] = [];
  if (item.year) {
    parts.push(String(item.year));
  }
  if (item.seasonNumber !== null && item.seasonNumber !== undefined) {
    parts.push(`Season ${item.seasonNumber}`);
  }
  if (item.episodeNumber !== null && item.episodeNumber !== undefined) {
    parts.push(`Episode ${item.episodeNumber}`);
  }
  return parts.join(' • ');
}

export function formatStatusLabel(item: { status: string; deferredReason?: string | null }): string {
  if (item.status === 'queued') {
    if (item.deferredReason === 'waiting_for_space') {
      return 'Queued (Waiting for Space)';
    }
    return 'Queued (Waiting for Slot)';
  }
  return item.status;
}

export function getStatusBadgeClass(item: { status: string; deferredReason?: string | null }): string {
  if (item.status === 'queued') {
    if (item.deferredReason === 'waiting_for_space') {
      return 'bg-amber-950/60 text-amber-400 border-amber-800';
    }
    return 'bg-blue-950/50 text-blue-300 border-blue-800/80';
  }
  switch (item.status) {
    case 'downloading':
      return 'bg-blue-950/60 text-blue-400 border-blue-800';
    case 'hardlinking':
    case 'unarchiving':
      return 'bg-indigo-950/60 text-indigo-400 border-indigo-800';
    case 'seeding':
      return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
    case 'done':
      return 'bg-green-950/60 text-green-400 border-green-800';
    case 'error':
      return 'bg-red-950/60 text-red-400 border-red-800';
    case 'deleted':
      return 'bg-zinc-900 text-zinc-500 border-zinc-800';
    default:
      return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  }
}

