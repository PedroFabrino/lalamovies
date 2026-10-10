import { DiscordNotifier, resolveDiscordWebhookUrl } from './discordNotifier';
import { TelegramNotifier } from './telegramNotifier';

export * from './discordNotifier';
export * from './telegramNotifier';

export type NotificationEvent =
  | 'download.completed'
  | 'cleanup.scheduled'
  | 'cleanup.done'
  | 'stream.ready'
  | 'download.failed';

export interface NotificationPayload {
  title: string;
  requestId?: string;
  mediaType?: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  requestedBy?: string;
  userId?: string;
  telegramChatId?: string | null;
  scheduledDeleteAt?: string;
  path?: string;
  reason?: string;
  error?: string;
  jellyfinUrl?: string;
  recipientEmails?: string[];
  telegramSnatchMessageId?: number | null;
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

export class ResendNotifier implements INotificationService {
  constructor(private apiKey?: string) {}

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    const key = this.apiKey || process.env.RESEND_API_KEY;
    if (!key || !key.trim()) {
      return;
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
  telegramBotToken?: string;
  getUserTelegramChatId?: (userId: string) => Promise<string | null> | (string | null);
  isDiscordEnabled?: () => Promise<boolean> | boolean;
  getTelegramSnatchMessageId?: (requestId: string) => Promise<number | null> | (number | null);
  updateReportCard?: (chatId: string, userId: string) => Promise<void>;
}

export class NotificationService implements INotificationService {
  private notifiers: INotificationService[];

  constructor(
    webhookUrlOrOptions?: string | NotificationServiceOptions,
    resendApiKey?: string
  ) {
    let webhookUrl: string | undefined;
    let resendKey: string | undefined = resendApiKey;
    let telegramBotToken: string | undefined;
    let getUserTelegramChatId: ((userId: string) => Promise<string | null> | (string | null)) | undefined;
    let isDiscordEnabled: (() => Promise<boolean> | boolean) | undefined;
    let getTelegramSnatchMessageId: ((requestId: string) => Promise<number | null> | (number | null)) | undefined;
    let updateReportCard: ((chatId: string, userId: string) => Promise<void>) | undefined;

    if (typeof webhookUrlOrOptions === 'object' && webhookUrlOrOptions !== null) {
      webhookUrl = webhookUrlOrOptions.webhookUrl;
      resendKey = webhookUrlOrOptions.resendApiKey ?? resendApiKey;
      telegramBotToken = webhookUrlOrOptions.telegramBotToken;
      getUserTelegramChatId = webhookUrlOrOptions.getUserTelegramChatId;
      isDiscordEnabled = webhookUrlOrOptions.isDiscordEnabled;
      getTelegramSnatchMessageId = webhookUrlOrOptions.getTelegramSnatchMessageId;
      updateReportCard = webhookUrlOrOptions.updateReportCard;
    } else {
      webhookUrl = webhookUrlOrOptions;
    }

    this.notifiers = [
      new DiscordNotifier(webhookUrl, isDiscordEnabled),
      new ResendNotifier(resendKey),
      new TelegramNotifier(telegramBotToken, getUserTelegramChatId, {
        getTelegramSnatchMessageId,
        updateReportCard,
      }),
    ];
  }

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    await Promise.all(this.notifiers.map((n) => n.send(event, payload)));
  }
}