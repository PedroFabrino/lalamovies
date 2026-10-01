export interface WatchPartyMediaInfo {
  title: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  year?: number | null;
  completedAt?: string;
}

export interface WatchPartyNotificationContext {
  roomId: string;
  hostUsername: string;
  title: string;
  mediaType: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  posterUrl?: string | null;
  controlMode: 'everyone' | 'host_only';
  appBaseUrl?: string;
  previousMedia?: WatchPartyMediaInfo;
  historyCount?: number;
}

export interface DiscordEmbedThumbnail {
  url: string;
}

export interface DiscordEmbedFooter {
  text: string;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: DiscordEmbedField[];
  thumbnail?: DiscordEmbedThumbnail;
  timestamp: string;
  footer: DiscordEmbedFooter;
}

export interface DiscordWebhookMessagePayload {
  embeds: DiscordEmbed[];
}

export interface WatchPartyProgressionPayload {
  finishedCardUpdate: DiscordWebhookMessagePayload;
  nowPlayingCard: DiscordWebhookMessagePayload;
}

export function formatWatchPartyMediaTitle(item: {
  title: string;
  mediaType?: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}): string {
  const { title, mediaType, year, seasonNumber, episodeNumber } = item;
  if (mediaType === 'movie' && year) {
    return `${title} (${year})`;
  }
  if (seasonNumber !== null && seasonNumber !== undefined && episodeNumber !== null && episodeNumber !== undefined) {
    const s = String(seasonNumber).padStart(2, '0');
    const e = String(episodeNumber).padStart(2, '0');
    return `${title} - S${s}E${e}`;
  }
  if (seasonNumber !== null && seasonNumber !== undefined) {
    const s = String(seasonNumber).padStart(2, '0');
    return `${title} - Season ${s}`;
  }
  if (year) {
    return `${title} (${year})`;
  }
  return title;
}

export function buildWatchPartyStartPayload(
  ctx: WatchPartyNotificationContext
): DiscordWebhookMessagePayload {
  const displayTitle = formatWatchPartyMediaTitle(ctx);
  const joinUrl = ctx.appBaseUrl
    ? `${ctx.appBaseUrl.replace(/\/$/, '')}/party/${ctx.roomId}`
    : `/party/${ctx.roomId}`;

  const controlLabel = ctx.controlMode === 'host_only' ? 'Host Only' : 'Democratic (Everyone)';

  const fields: DiscordEmbedField[] = [
    { name: 'Now Playing', value: displayTitle, inline: true },
    { name: 'Host', value: ctx.hostUsername, inline: true },
    { name: 'Control Mode', value: controlLabel, inline: true },
    { name: 'Watch Party', value: `[Join Watch Party](${joinUrl})`, inline: false },
  ];

  const embed: DiscordEmbed = {
    title: '🎉 Watch Party Started',
    description: `**${ctx.hostUsername}** started a watch party for **${displayTitle}**!`,
    color: 0x8b5cf6, // Vibrant purple
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: 'Media Download Manager • SyncPlay' },
  };

  if (ctx.posterUrl) {
    embed.thumbnail = { url: ctx.posterUrl };
  }

  return { embeds: [embed] };
}

export function buildWatchPartyProgressionPayload(
  ctx: WatchPartyNotificationContext
): WatchPartyProgressionPayload {
  const prevTitle = ctx.previousMedia
    ? formatWatchPartyMediaTitle(ctx.previousMedia)
    : 'Previous Item';

  const newTitle = formatWatchPartyMediaTitle(ctx);
  const joinUrl = ctx.appBaseUrl
    ? `${ctx.appBaseUrl.replace(/\/$/, '')}/party/${ctx.roomId}`
    : `/party/${ctx.roomId}`;

  const finishedEmbed: DiscordEmbed = {
    title: `✅ Finished: ${prevTitle}`,
    description: `Party completed viewing **${prevTitle}**.`,
    color: 0x10b981, // Emerald green
    fields: [
      { name: 'Status', value: 'Finished', inline: true },
      { name: 'Host', value: ctx.hostUsername, inline: true },
    ],
    timestamp: ctx.previousMedia?.completedAt || new Date().toISOString(),
    footer: { text: 'Media Download Manager • SyncPlay' },
  };

  const newFields: DiscordEmbedField[] = [
    { name: 'Now Playing', value: newTitle, inline: true },
    { name: 'Host', value: ctx.hostUsername, inline: true },
    { name: 'Watch Party', value: `[Join Watch Party](${joinUrl})`, inline: false },
  ];

  const nowPlayingEmbed: DiscordEmbed = {
    title: `▶️ Now Playing: ${newTitle}`,
    description: `Watch party moved to **${newTitle}**. Join below!`,
    color: 0x8b5cf6, // Purple
    fields: newFields,
    timestamp: new Date().toISOString(),
    footer: { text: 'Media Download Manager • SyncPlay' },
  };

  if (ctx.posterUrl) {
    nowPlayingEmbed.thumbnail = { url: ctx.posterUrl };
  }

  return {
    finishedCardUpdate: { embeds: [finishedEmbed] },
    nowPlayingCard: { embeds: [nowPlayingEmbed] },
  };
}

export function buildWatchPartyEndedPayload(
  ctx: WatchPartyNotificationContext
): DiscordWebhookMessagePayload {
  const displayTitle = formatWatchPartyMediaTitle(ctx);
  const count = ctx.historyCount !== undefined ? String(ctx.historyCount) : '1';

  const fields: DiscordEmbedField[] = [
    { name: 'Host', value: ctx.hostUsername, inline: true },
    { name: 'Total Titles Watched', value: count, inline: true },
  ];

  const embed: DiscordEmbed = {
    title: '🏁 Watch Party Ended',
    description: `Watch party for **${displayTitle}** hosted by **${ctx.hostUsername}** has ended. Thanks for watching!`,
    color: 0x6b7280, // Gray
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: 'Media Download Manager • SyncPlay' },
  };

  return { embeds: [embed] };
}
