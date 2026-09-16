export type NotificationEvent = 'download.completed' | 'cleanup.scheduled' | 'cleanup.done' | 'stream.ready';

export interface NotificationPayload {
  title: string;
  requestId?: string;
  mediaType?: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  requestedBy?: string;
  scheduledDeleteAt?: string;
  path?: string;
  reason?: string;
  jellyfinUrl?: string;
  recipientEmails?: string[];
}

export function formatNotificationMediaTitle(payload: NotificationPayload): string {
  const { title, mediaType, year, seasonNumber, episodeNumber } = payload;
  if (mediaType === 'movie' && year) {
    return `${title} (${year})`;
  }
  if (mediaType === 'tv_show' || mediaType === 'anime') {
    if (episodeNumber !== null && episodeNumber !== undefined) {
      const s = String(seasonNumber ?? 1).padStart(2, '0');
      const e = String(episodeNumber).padStart(2, '0');
      return `${title} - S${s}E${e}`;
    }
    if (seasonNumber !== null && seasonNumber !== undefined) {
      const s = String(seasonNumber).padStart(2, '0');
      return `${title} - Season ${s}`;
    }
  }
  return title;
}

export interface INotificationService {
  send(event: NotificationEvent, payload: NotificationPayload): Promise<void>;
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
  timestamp: string;
  footer: {
    text: string;
  };
}

export class DiscordNotifier implements INotificationService {
  constructor(
    private webhookUrl?: string,
    private isDiscordEnabled?: () => Promise<boolean> | boolean
  ) {}

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    if (payload.mediaType === 'private') {
      return; // Suppress private notifications from Discord webhook to preserve invisibility
    }

    if (this.isDiscordEnabled) {
      const enabled = await this.isDiscordEnabled();
      if (!enabled) {
        return; // Silently skip webhook when feature is disabled
      }
    }

    const url = this.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (!url || !url.trim()) {
      return; // Silently no-op if no URL configured
    }

    const displayTitle = formatNotificationMediaTitle(payload);
    let title = 'Media Download Manager';
    let description = '';
    let color = 0x3b82f6; // Blue default
    const fields: DiscordEmbedField[] = [];

    switch (event) {
      case 'download.completed': {
        title = 'Download Completed';
        description = `**${displayTitle}** has finished downloading and is now available in Jellyfin.`;
        color = 0x22c55e; // Green

        if (payload.mediaType) {
          fields.push({
            name: 'Media Type',
            value: payload.mediaType.toUpperCase().replace('_', ' '),
            inline: true,
          });
        }
        if (payload.mediaType === 'movie' && payload.year) {
          fields.push({
            name: 'Year',
            value: String(payload.year),
            inline: true,
          });
        }
        if (payload.mediaType === 'tv_show' || payload.mediaType === 'anime') {
          if (payload.seasonNumber !== null && payload.seasonNumber !== undefined) {
            fields.push({
              name: 'Season',
              value: String(payload.seasonNumber).padStart(2, '0'),
              inline: true,
            });
          }
          if (payload.episodeNumber !== null && payload.episodeNumber !== undefined) {
            fields.push({
              name: 'Episode',
              value: String(payload.episodeNumber).padStart(2, '0'),
              inline: true,
            });
          }
        }
        if (payload.requestedBy) {
          fields.push({
            name: 'Requested By',
            value: payload.requestedBy,
            inline: true,
          });
        }
        const jfUrl =
          payload.jellyfinUrl ||
          process.env.JELLYFIN_PUBLIC_URL ||
          (process.env.JELLYFIN_DOMAIN ? `https://${process.env.JELLYFIN_DOMAIN}` : undefined) ||
          process.env.JELLYFIN_URL;
        if (jfUrl) {
          fields.push({
            name: 'Jellyfin',
            value: `[Open in Jellyfin](${jfUrl})`,
            inline: false,
          });
        }
        break;
      }
      case 'cleanup.scheduled': {
        title = 'Cleanup Warning (24h Notice)';
        description = `**${displayTitle}** is scheduled for auto-deletion in 24 hours to free up disk space. An Admin can set the Keep Flag in the dashboard to cancel deletion.`;
        color = 0xf59e0b; // Amber/Orange

        if (payload.scheduledDeleteAt) {
          fields.push({
            name: 'Scheduled Deletion',
            value: payload.scheduledDeleteAt,
            inline: true,
          });
        }
        fields.push({
          name: 'Note',
          value: 'An Admin can set the Keep Flag to cancel.',
          inline: false,
        });
        break;
      }
      case 'cleanup.done': {
        title = 'Media Cleaned Up';
        description = `**${displayTitle}** has been removed from the server library to reclaim disk space.`;
        color = 0xef4444; // Red

        if (payload.requestedBy) {
          fields.push({
            name: 'Requested By',
            value: payload.requestedBy,
            inline: true,
          });
        }
        break;
      }
      case 'stream.ready': {
        title = '⚡ Instant Stream Ready';
        description = `**${displayTitle}** is now mounted in the Jellyfin Stream library and ready to watch!`;
        color = 0xf59e0b; // Amber

        fields.push({
          name: 'Tier',
          value: 'Ephemeral Stream (24h cloud cache)',
          inline: true,
        });

        const jfUrl =
          payload.jellyfinUrl ||
          process.env.JELLYFIN_PUBLIC_URL ||
          (process.env.JELLYFIN_DOMAIN ? `https://${process.env.JELLYFIN_DOMAIN}` : undefined) ||
          process.env.JELLYFIN_URL;
        if (jfUrl) {
          fields.push({
            name: 'Jellyfin',
            value: `[Watch Now](${jfUrl})`,
            inline: false,
          });
        }
        break;
      }
    }

    const embed: DiscordEmbed = {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Media Download Manager',
      },
    };

    if (fields.length > 0) {
      embed.fields = fields;
    }

    const body = {
      embeds: [embed],
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(`[DiscordNotifier] Webhook returned status ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      console.error('[DiscordNotifier] Failed to send webhook:', err);
    }
  }
}

export class ResendNotifier implements INotificationService {
  constructor(private apiKey?: string) {}

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    const key = this.apiKey || process.env.RESEND_API_KEY;
    if (!key || !key.trim()) {
      return; // Silent when key not set
    }
    const recipients = payload.recipientEmails?.length
      ? ` to [${payload.recipientEmails.join(', ')}]`
      : '';
    console.log(
      `[ResendNotifier] ${event}: ${payload.title}${recipients} (email sending is not yet implemented)`
    );
  }
}

export interface NotificationServiceOptions {
  webhookUrl?: string;
  resendApiKey?: string;
  isDiscordEnabled?: () => Promise<boolean> | boolean;
}

export class NotificationService implements INotificationService {
  private notifiers: INotificationService[];

  constructor(
    webhookUrlOrOptions?: string | NotificationServiceOptions,
    resendApiKey?: string
  ) {
    let webhookUrl: string | undefined;
    let resendKey: string | undefined = resendApiKey;
    let isDiscordEnabled: (() => Promise<boolean> | boolean) | undefined;

    if (typeof webhookUrlOrOptions === 'object' && webhookUrlOrOptions !== null) {
      webhookUrl = webhookUrlOrOptions.webhookUrl;
      resendKey = webhookUrlOrOptions.resendApiKey ?? resendApiKey;
      isDiscordEnabled = webhookUrlOrOptions.isDiscordEnabled;
    } else {
      webhookUrl = webhookUrlOrOptions;
    }

    this.notifiers = [
      new DiscordNotifier(webhookUrl, isDiscordEnabled),
      new ResendNotifier(resendKey),
    ];
  }

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    await Promise.all(this.notifiers.map((n) => n.send(event, payload)));
  }
}