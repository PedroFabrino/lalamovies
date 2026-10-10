import {
  MetadataCandidate,
  InlineKeyboardMarkup,
  ParsedIntent,
} from './types';
import { TelegramBotClient } from './telegramClient';
import { CallbackStore } from './callbackStore';
import { MdmApiClient } from './apiClient';

export interface EpisodicSession {
  chatId: number | string;
  userId: string;
  candidate: MetadataCandidate;
  intent: ParsedIntent;
  seasonNumber: number;
  episodeNumber?: number;
  isSeasonPack: boolean;
  watchNext: boolean;
}

export class EpisodicHandler {
  constructor(
    private telegram: TelegramBotClient,
    private apiClient: MdmApiClient,
    private callbackStore: CallbackStore
  ) {}

  buildKeyboard(session: EpisodicSession, token: string): InlineKeyboardMarkup {
    const s = String(session.seasonNumber).padStart(2, '0');
    const e = session.episodeNumber !== undefined ? String(session.episodeNumber).padStart(2, '0') : '01';

    const packActive = session.isSeasonPack ? '🔘' : '⚪';
    const epActive = !session.isSeasonPack ? '🔘' : '⚪';
    const bellIcon = session.watchNext ? '🔔' : '🔕';
    const bellState = session.watchNext ? 'SIM' : 'NÃO';

    return {
      inline_keyboard: [
        [
          {
            text: `${packActive} 📦 Temporada ${session.seasonNumber} Completa`,
            callback_data: `e:${token}:mode_pack`,
          },
        ],
        [
          {
            text: `${epActive} 📺 Episódio S${s}E${e}`,
            callback_data: `e:${token}:mode_ep`,
          },
        ],
        [
          {
            text: `${bellIcon} Acompanhar Novos Episódios: ${bellState}`,
            callback_data: `e:${token}:toggle_watch`,
          },
        ],
        [
          { text: '➡️ Baixar Agora', callback_data: `e:${token}:confirm` },
          { text: '❌ Cancelar', callback_data: `e:${token}:cancel` },
        ],
      ],
    };
  }

  formatMessage(session: EpisodicSession): string {
    const s = String(session.seasonNumber).padStart(2, '0');
    const e = session.episodeNumber !== undefined ? String(session.episodeNumber).padStart(2, '0') : '01';
    const target = session.isSeasonPack
      ? `Temporada ${session.seasonNumber} Completa (Season Pack)`
      : `Episódio S${s}E${e}`;

    return (
      `📺 *Configuração de Episódios*\n\n` +
      `Título: *${session.candidate.title}*\n` +
      `Seleção atual: *${target}*\n` +
      `Acompanhar novos episódios: *${session.watchNext ? 'Ativado' : 'Desativado'}*\n\n` +
      `Selecione o formato desejado e confirme o download:`
    );
  }

  async promptEpisodicChoice(
    chatId: number | string,
    userId: string,
    candidate: MetadataCandidate,
    intent: ParsedIntent,
    onReadyToSnatch: (session: EpisodicSession) => Promise<void>
  ): Promise<void> {
    // If intent already strictly specified both season and episode or season pack, check if progress is needed
    let seasonNumber = intent.seasonNumber || 1;
    let episodeNumber = intent.episodeNumber;
    let isSeasonPack = Boolean(intent.isSeasonPack);

    // Query series progress to see existing library status
    try {
      const progress = await this.apiClient.getSeriesProgress(
        userId,
        candidate.id,
        candidate.title
      );
      if (progress.hasProgress) {
        if (!intent.seasonNumber && progress.suggestedSeason) {
          seasonNumber = progress.suggestedSeason;
        }
        if (intent.episodeNumber === undefined && progress.suggestedEpisode) {
          episodeNumber = progress.suggestedEpisode;
        }
      }
    } catch {
      // Continue with defaults
    }

    if (episodeNumber === undefined && !isSeasonPack) {
      episodeNumber = 1;
    }

    const session: EpisodicSession = {
      chatId,
      userId,
      candidate,
      intent,
      seasonNumber,
      episodeNumber,
      isSeasonPack,
      watchNext: true,
    };

    const token = this.callbackStore.save(session);
    const text = this.formatMessage(session);
    const keyboard = this.buildKeyboard(session, token);

    await this.telegram.sendMessage(chatId, text, { replyMarkup: keyboard });
  }

  async handleEpisodicCallback(
    chatId: number | string,
    messageId: number,
    action: string,
    token: string,
    onConfirm: (session: EpisodicSession) => Promise<void>
  ): Promise<void> {
    const session = this.callbackStore.get<EpisodicSession>(token);
    if (!session) {
      await this.telegram.editMessageText(chatId, messageId, '⚠️ Sessão de episódios expirada.');
      return;
    }

    if (action === 'cancel') {
      this.callbackStore.delete(token);
      await this.telegram.editMessageText(chatId, messageId, '🚫 Download cancelado.');
      return;
    }

    if (action === 'confirm') {
      this.callbackStore.delete(token);
      await onConfirm(session);
      return;
    }

    if (action === 'mode_pack') {
      session.isSeasonPack = true;
    } else if (action === 'mode_ep') {
      session.isSeasonPack = false;
      if (session.episodeNumber === undefined) session.episodeNumber = 1;
    } else if (action === 'toggle_watch') {
      session.watchNext = !session.watchNext;
    }

    this.callbackStore.update(token, session);
    const text = this.formatMessage(session);
    const keyboard = this.buildKeyboard(session, token);

    await this.telegram.editMessageText(chatId, messageId, text, {
      replyMarkup: keyboard,
    });
  }
}
