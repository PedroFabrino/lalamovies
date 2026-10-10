import {
  TelegramUpdate,
  TelegramMessage,
  InlineKeyboardMarkup,
} from './types';

export interface TelegramClientOptions {
  botToken: string;
}

export class TelegramBotClient {
  private botToken: string;
  private baseUrl: string;

  constructor(options: TelegramClientOptions) {
    this.botToken = options.botToken;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async getUpdates(offset?: number, timeout: number = 25): Promise<TelegramUpdate[]> {
    try {
      const url = new URL(`${this.baseUrl}/getUpdates`);
      if (offset !== undefined) url.searchParams.set('offset', String(offset));
      url.searchParams.set('timeout', String(timeout));

      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) return [];
      const data = (await res.json()) as { ok: boolean; result: TelegramUpdate[] };
      return data.ok && Array.isArray(data.result) ? data.result : [];
    } catch {
      return [];
    }
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options?: {
      parseMode?: 'Markdown' | 'HTML';
      replyMarkup?: InlineKeyboardMarkup;
    }
  ): Promise<TelegramMessage | null> {
    try {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || 'Markdown',
      };
      if (options?.replyMarkup) {
        body.reply_markup = options.replyMarkup;
      }

      const res = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Fallback without parse_mode if formatting causes telegram parse error
        if (options?.parseMode) {
          return this.sendMessage(chatId, text, { replyMarkup: options.replyMarkup });
        }
        return null;
      }
      const data = (await res.json()) as { ok: boolean; result: TelegramMessage };
      return data.ok ? data.result : null;
    } catch {
      return null;
    }
  }

  async sendPhoto(
    chatId: number | string,
    photoUrl: string,
    caption?: string,
    options?: {
      parseMode?: 'Markdown';
      replyMarkup?: InlineKeyboardMarkup;
    }
  ): Promise<TelegramMessage | null> {
    try {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        photo: photoUrl,
        caption: caption || '',
        parse_mode: options?.parseMode || 'Markdown',
      };
      if (options?.replyMarkup) {
        body.reply_markup = options.replyMarkup;
      }

      const res = await fetch(`${this.baseUrl}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // If image fails, fallback to regular message
        return this.sendMessage(chatId, caption || photoUrl, options);
      }
      const data = (await res.json()) as { ok: boolean; result: TelegramMessage };
      return data.ok ? data.result : null;
    } catch {
      return this.sendMessage(chatId, caption || photoUrl, options);
    }
  }

  async editMessageMedia(
    chatId: number | string,
    messageId: number,
    photoUrl: string,
    caption?: string,
    replyMarkup?: InlineKeyboardMarkup
  ): Promise<boolean> {
    try {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        message_id: messageId,
        media: {
          type: 'photo',
          media: photoUrl,
          caption: caption || '',
          parse_mode: 'Markdown',
        },
      };
      if (replyMarkup) {
        body.reply_markup = replyMarkup;
      }

      const res = await fetch(`${this.baseUrl}/editMessageMedia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async editMessageCaption(
    chatId: number | string,
    messageId: number,
    caption: string,
    replyMarkup?: InlineKeyboardMarkup
  ): Promise<boolean> {
    try {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        message_id: messageId,
        caption,
        parse_mode: 'Markdown',
      };
      if (replyMarkup) {
        body.reply_markup = replyMarkup;
      }

      const res = await fetch(`${this.baseUrl}/editMessageCaption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: {
      parseMode?: 'Markdown';
      replyMarkup?: InlineKeyboardMarkup;
    }
  ): Promise<boolean> {
    try {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: options?.parseMode || 'Markdown',
      };
      if (options?.replyMarkup) {
        body.reply_markup = options.replyMarkup;
      }

      const res = await fetch(`${this.baseUrl}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    try {
      const body: Record<string, unknown> = { callback_query_id: callbackQueryId };
      if (text) body.text = text;

      const res = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
