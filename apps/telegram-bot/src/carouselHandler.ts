import {
  MetadataCandidate,
  InlineKeyboardMarkup,
  ParsedIntent,
} from './types';
import { TelegramBotClient } from './telegramClient';
import { CallbackStore } from './callbackStore';

export interface CarouselSession {
  chatId: number | string;
  userId: string;
  candidates: MetadataCandidate[];
  currentIndex: number;
  intent: ParsedIntent;
}

export class CarouselHandler {
  constructor(
    private telegram: TelegramBotClient,
    private callbackStore: CallbackStore
  ) {}

  formatCaption(candidate: MetadataCandidate, index: number, total: number): string {
    const typeLabel =
      candidate.mediaType === 'movie'
        ? 'Filme'
        : candidate.mediaType === 'anime'
        ? 'Anime'
        : 'Série';

    const yearStr = candidate.year ? ` (${candidate.year})` : '';
    const overview = candidate.overview
      ? candidate.overview.length > 300
        ? candidate.overview.slice(0, 297) + '...'
        : candidate.overview
      : 'Sem sinopse disponível.';

    return `🎬 *${candidate.title}*${yearStr}\n*Tipo:* ${typeLabel}\n\n${overview}\n\n📄 _Resultado ${index + 1} de ${total}_`;
  }

  buildKeyboard(token: string, index: number, total: number): InlineKeyboardMarkup {
    const navRow = [];
    if (index > 0) {
      navRow.push({ text: '⬅️ Anterior', callback_data: `c:${token}:prev` });
    }
    if (index < total - 1) {
      navRow.push({ text: 'Próximo ➡️', callback_data: `c:${token}:next` });
    }

    const rows = [];
    if (navRow.length > 0) {
      rows.push(navRow);
    }
    rows.push([
      { text: '✅ Selecionar', callback_data: `c:${token}:pick` },
      { text: '❌ Cancelar', callback_data: `c:${token}:cancel` },
    ]);

    return { inline_keyboard: rows };
  }

  async sendCarousel(
    chatId: number | string,
    userId: string,
    candidates: MetadataCandidate[],
    intent: ParsedIntent
  ): Promise<void> {
    if (candidates.length === 0) {
      await this.telegram.sendMessage(
        chatId,
        `❌ Nenhum resultado encontrado para "*${intent.title || 'sua busca'}*".`
      );
      return;
    }

    const session: CarouselSession = {
      chatId,
      userId,
      candidates,
      currentIndex: 0,
      intent,
    };

    const token = this.callbackStore.save(session);
    const first = candidates[0];
    const caption = this.formatCaption(first, 0, candidates.length);
    const keyboard = this.buildKeyboard(token, 0, candidates.length);

    if (first.posterUrl) {
      await this.telegram.sendPhoto(chatId, first.posterUrl, caption, {
        replyMarkup: keyboard,
      });
    } else {
      await this.telegram.sendMessage(chatId, caption, {
        replyMarkup: keyboard,
      });
    }
  }

  async handleCarouselCallback(
    chatId: number | string,
    messageId: number,
    action: string,
    token: string,
    onSelect: (session: CarouselSession, candidate: MetadataCandidate) => Promise<void>
  ): Promise<void> {
    const session = this.callbackStore.get<CarouselSession>(token);
    if (!session) {
      await this.telegram.editMessageText(chatId, messageId, '⚠️ Sessão de busca expirada.');
      return;
    }

    if (action === 'cancel') {
      this.callbackStore.delete(token);
      await this.telegram.editMessageText(chatId, messageId, '🚫 Busca cancelada.');
      return;
    }

    if (action === 'pick') {
      const selected = session.candidates[session.currentIndex];
      this.callbackStore.delete(token);
      if (typeof this.telegram.deleteMessage === 'function') {
        await this.telegram.deleteMessage(chatId, messageId).catch(() => {});
      }
      await onSelect(session, selected);
      return;
    }

    let newIndex = session.currentIndex;
    if (action === 'prev' && newIndex > 0) {
      newIndex--;
    } else if (action === 'next' && newIndex < session.candidates.length - 1) {
      newIndex++;
    }

    if (newIndex === session.currentIndex) return;

    session.currentIndex = newIndex;
    this.callbackStore.update(token, session);

    const current = session.candidates[newIndex];
    const caption = this.formatCaption(current, newIndex, session.candidates.length);
    const keyboard = this.buildKeyboard(token, newIndex, session.candidates.length);

    if (current.posterUrl) {
      const mediaEdited = await this.telegram.editMessageMedia(
        chatId,
        messageId,
        current.posterUrl,
        caption,
        keyboard
      );
      if (!mediaEdited) {
        await this.telegram.editMessageCaption(chatId, messageId, caption, keyboard);
      }
    } else {
      await this.telegram.editMessageCaption(chatId, messageId, caption, keyboard);
    }
  }
}
