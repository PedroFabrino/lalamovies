import { MetadataCandidate, ReleaseCandidate } from './types';

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export function formatMediaSubtitle(
  seasonNumber?: number,
  episodeNumber?: number,
  isSeasonPack?: boolean
): string {
  if (isSeasonPack && seasonNumber) {
    return ` (Temporada ${seasonNumber})`;
  }
  if (seasonNumber && episodeNumber !== undefined) {
    const s = String(seasonNumber).padStart(2, '0');
    const e = String(episodeNumber).padStart(2, '0');
    return ` - S${s}E${e}`;
  }
  return '';
}

export function formatConfirmationCard(
  candidate: MetadataCandidate,
  release: ReleaseCandidate,
  seasonNumber?: number,
  episodeNumber?: number,
  isSeasonPack?: boolean,
  watchNext?: boolean
): string {
  const subTitle = formatMediaSubtitle(seasonNumber, episodeNumber, isSeasonPack);
  const sizeStr = formatBytes(release.sizeBytes);
  const resStr = release.resolution || 'Auto';

  let waitlistNotice = '';
  if (watchNext && ['tv_show', 'anime'].includes(candidate.mediaType)) {
    if (isSeasonPack) {
      waitlistNotice = '\n🔔 *Waitlist:* Próxima temporada monitorada automaticamente.\n';
    } else {
      const nextEp = (episodeNumber ?? 1) + 1;
      const s = String(seasonNumber ?? 1).padStart(2, '0');
      const e = String(nextEp).padStart(2, '0');
      waitlistNotice = `\n🔔 *Waitlist:* Monitorando próximo episódio (S${s}E${e}) automaticamente.\n`;
    }
  }

  return (
    `🚀 *Download Iniciado!*\n\n` +
    `*${candidate.title}${subTitle}*\n` +
    `• *Resolução:* ${resStr}\n` +
    `• *Tamanho:* ${sizeStr}\n` +
    `• *Seeders:* ${release.seeders}\n` +
    `• *Tracker:* ${release.indexer}\n` +
    waitlistNotice +
    `\nVocê receberá uma notificação aqui assim que estiver pronto para assistir!`
  );
}
