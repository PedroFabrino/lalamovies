import {
  NotificationEvent,
  NotificationPayload,
  INotificationService,
  formatNotificationMediaTitle,
} from './notifications';

export interface TelegramNotifierOptions {
  getTelegramSnatchMessageId?: (requestId: string) => Promise<number | null> | (number | null);
  updateReportCard?: (chatId: string, userId: string) => Promise<void>;
}

export class TelegramNotifier implements INotificationService {
  constructor(
    private botToken?: string,
    private getUserTelegramChatId?: (userId: string) => Promise<string | null> | (string | null),
    private options?: TelegramNotifierOptions
  ) {}

  async send(event: NotificationEvent, payload: NotificationPayload): Promise<void> {
    const token = this.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !token.trim()) {
      return;
    }

    let chatId = payload.telegramChatId;
    if (!chatId && payload.userId && this.getUserTelegramChatId) {
      chatId = await this.getUserTelegramChatId(payload.userId);
    }

    if (!chatId || !chatId.trim()) {
      return;
    }

    if (!['download.completed', 'stream.ready', 'download.failed'].includes(event)) {
      return;
    }

    // Delete ephemeral initiation snatch message if present
    if (['download.completed', 'download.failed'].includes(event)) {
      const snatchMsgId =
        payload.telegramSnatchMessageId ??
        (payload.requestId && this.options?.getTelegramSnatchMessageId
          ? await this.options.getTelegramSnatchMessageId(payload.requestId)
          : null);

      if (snatchMsgId) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId.trim(),
              message_id: snatchMsgId,
            }),
          });
        } catch (err) {
          console.error('[TelegramNotifier] Failed to delete initiation message:', err);
        }
      }
    }

    const displayTitle = formatNotificationMediaTitle(payload);
    let message = '';
    const jfUrl =
      payload.jellyfinUrl ||
      process.env.JELLYFIN_PUBLIC_URL ||
      (process.env.JELLYFIN_DOMAIN ? `https://${process.env.JELLYFIN_DOMAIN}` : undefined) ||
      process.env.JELLYFIN_URL;

    const esc = (text: string) => text.replace(/([*_`\[\]])/g, '\\$1');

    switch (event) {
      case 'download.completed':
        message = `🎬 *Download Concluído!*\n\n*${esc(displayTitle)}* terminou de baixar e já está disponível no Jellyfin.`;
        if (jfUrl) {
          message += `\n\n▶️ [Assistir no Jellyfin](${jfUrl})`;
        }
        break;
      case 'stream.ready':
        message = `⚡ *Stream Instantâneo Pronto!*\n\n*${esc(displayTitle)}* já está montado e pronto para assistir.`;
        if (jfUrl) {
          message += `\n\n▶️ [Assistir no Jellyfin](${jfUrl})`;
        }
        break;
      case 'download.failed':
        message = `❌ *Falha no Download*\n\nNão foi possível concluir o download de *${esc(displayTitle)}*.`;
        if (payload.error) {
          message += `\nMotivo: ${esc(payload.error)}`;
        }
        break;
    }

    if (!message) return;

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (!res.ok) {
        console.error(`[TelegramNotifier] Telegram API returned status ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      console.error('[TelegramNotifier] Failed to send Telegram message:', err);
    }

    // Trigger in-place update of user's pinned Report Card
    if (
      ['download.completed', 'download.failed'].includes(event) &&
      this.options?.updateReportCard &&
      payload.userId
    ) {
      try {
        await this.options.updateReportCard(chatId.trim(), payload.userId);
      } catch (err) {
        console.error('[TelegramNotifier] Failed to update Report Card:', err);
      }
    }
  }
}
