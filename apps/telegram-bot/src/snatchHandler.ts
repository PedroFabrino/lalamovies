import {
  MetadataCandidate,
  ReleaseCandidate,
  InlineKeyboardMarkup,
} from './types';
import { TelegramBotClient } from './telegramClient';
import { CallbackStore } from './callbackStore';
import { MdmApiClient } from './apiClient';

export interface SnatchParams {
  chatId: number | string;
  userId: string;
  candidate: MetadataCandidate;
  seasonNumber?: number;
  episodeNumber?: number;
  isSeasonPack?: boolean;
  watchNext?: boolean;
}

export interface SnatchSession {
  chatId: number | string;
  userId: string;
  params: SnatchParams;
  releases: ReleaseCandidate[];
  activeRequestId?: string;
}

export class SnatchHandler {
  constructor(
    private telegram: TelegramBotClient,
    private apiClient: MdmApiClient,
    private callbackStore: CallbackStore
  ) {}

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }

  formatConfirmationCard(
    candidate: MetadataCandidate,
    release: ReleaseCandidate,
    seasonNumber?: number,
    episodeNumber?: number,
    isSeasonPack?: boolean
  ): string {
    let subTitle = '';
    if (isSeasonPack && seasonNumber) {
      subTitle = ` (Temporada ${seasonNumber})`;
    } else if (seasonNumber && episodeNumber !== undefined) {
      const s = String(seasonNumber).padStart(2, '0');
      const e = String(episodeNumber).padStart(2, '0');
      subTitle = ` - S${s}E${e}`;
    }

    const sizeStr = this.formatBytes(release.sizeBytes);
    const resStr = release.resolution || 'Auto';

    return (
      `🚀 *Download Iniciado!*\n\n` +
      `*${candidate.title}${subTitle}*\n` +
      `• *Resolução:* ${resStr}\n` +
      `• *Tamanho:* ${sizeStr}\n` +
      `• *Seeders:* ${release.seeders}\n` +
      `• *Tracker:* ${release.indexer}\n\n` +
      `Você receberá uma notificação aqui assim que estiver pronto para assistir!`
    );
  }

  async executeSnatch(params: SnatchParams): Promise<void> {
    const { chatId, userId, candidate, seasonNumber, episodeNumber, isSeasonPack } = params;

    const waitMsg = await this.telegram.sendMessage(
      chatId,
      `🔎 Buscando os melhores releases para *${candidate.title}*...`
    );

    const searchRes = await this.apiClient.searchReleases(userId, {
      title: candidate.title,
      mediaType: candidate.mediaType,
      year: candidate.year,
      seasonNumber: isSeasonPack ? seasonNumber : seasonNumber,
      episodeNumber: isSeasonPack ? undefined : episodeNumber,
      isSeasonPack,
    });

    if (searchRes.isFutureOrUnreleased || searchRes.releases.length === 0) {
      // Fallback to waitlist
      const waitlistRes = await this.apiClient.createWaitlist(userId, {
        title: candidate.title,
        mediaType: candidate.mediaType,
        tmdbId: candidate.id,
        year: candidate.year,
        seasonNumber,
        episodeNumber: isSeasonPack ? undefined : episodeNumber,
        waitlistNextSeason: params.watchNext,
      });

      const messageText = waitlistRes.ok
        ? `⏳ *Adicionado à Waitlist!*\n\nNenhum release disponível no momento para *${candidate.title}* (conteúdo não lançado ou sem sementes). O MDM monitorará automaticamente e baixará assim que estiver disponível.`
        : `⚠️ Nenhum release encontrado e não foi possível adicionar à waitlist: ${waitlistRes.message || 'Erro'}`;

      if (waitMsg) {
        await this.telegram.editMessageText(chatId, waitMsg.message_id, messageText);
      } else {
        await this.telegram.sendMessage(chatId, messageText);
      }
      return;
    }

    const selectedRelease = searchRes.recommendedRelease || searchRes.releases[0];
    const createRes = await this.apiClient.createRequest(userId, {
      title: candidate.title,
      mediaType: candidate.mediaType,
      downloadUrl: selectedRelease.downloadUrl,
      infoHash: selectedRelease.infoHash,
      tmdbId: candidate.id,
      year: candidate.year,
      seasonNumber,
      episodeNumber: isSeasonPack ? undefined : episodeNumber,
      isSeasonPack,
      qualityScore: selectedRelease.score,
      source: selectedRelease.indexer,
      resolution: selectedRelease.resolution,
    });

    if (!createRes.ok) {
      const errText = `❌ Erro ao iniciar download: ${createRes.error}`;
      if (waitMsg) {
        await this.telegram.editMessageText(chatId, waitMsg.message_id, errText);
      } else {
        await this.telegram.sendMessage(chatId, errText);
      }
      return;
    }

    const session: SnatchSession = {
      chatId,
      userId,
      params,
      releases: searchRes.releases,
      activeRequestId: createRes.id,
    };
    const token = this.callbackStore.save(session);

    const cardText = this.formatConfirmationCard(
      candidate,
      selectedRelease,
      seasonNumber,
      episodeNumber,
      isSeasonPack
    );

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🔍 Escolher Outro Release', callback_data: `r:${token}:menu` }],
      ],
    };

    if (waitMsg) {
      await this.telegram.editMessageText(chatId, waitMsg.message_id, cardText, {
        replyMarkup: keyboard,
      });
    } else {
      await this.telegram.sendMessage(chatId, cardText, { replyMarkup: keyboard });
    }
  }

  async handleReleaseCallback(
    chatId: number | string,
    messageId: number,
    action: string,
    token: string
  ): Promise<void> {
    const session = this.callbackStore.get<SnatchSession>(token);
    if (!session) {
      await this.telegram.editMessageText(chatId, messageId, '⚠️ Sessão de download expirada.');
      return;
    }

    if (action === 'menu') {
      const keyboardRows = [];
      const topReleases = session.releases.slice(0, 5);

      for (let i = 0; i < topReleases.length; i++) {
        const rel = topReleases[i];
        const res = rel.resolution || 'Auto';
        const size = this.formatBytes(rel.sizeBytes);
        keyboardRows.push([
          {
            text: `${res} • ${size} • S:${rel.seeders} (${rel.indexer})`,
            callback_data: `r:${token}:pick_${i}`,
          },
        ]);
      }
      keyboardRows.push([{ text: '🔙 Voltar', callback_data: `r:${token}:back` }]);

      await this.telegram.editMessageText(
        chatId,
        messageId,
        `🎯 *Selecione um release alternativo para download:*`,
        { replyMarkup: { inline_keyboard: keyboardRows } }
      );
      return;
    }

    if (action === 'back') {
      const selectedRelease = session.releases[0];
      const cardText = this.formatConfirmationCard(
        session.params.candidate,
        selectedRelease,
        session.params.seasonNumber,
        session.params.episodeNumber,
        session.params.isSeasonPack
      );
      await this.telegram.editMessageText(chatId, messageId, cardText, {
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🔍 Escolher Outro Release', callback_data: `r:${token}:menu` }],
          ],
        },
      });
      return;
    }

    if (action.startsWith('pick_')) {
      const index = parseInt(action.replace('pick_', ''), 10);
      const chosenRelease = session.releases[index];
      if (!chosenRelease) return;

      const createRes = await this.apiClient.createRequest(session.userId, {
        title: session.params.candidate.title,
        mediaType: session.params.candidate.mediaType,
        downloadUrl: chosenRelease.downloadUrl,
        infoHash: chosenRelease.infoHash,
        tmdbId: session.params.candidate.id,
        year: session.params.candidate.year,
        seasonNumber: session.params.seasonNumber,
        episodeNumber: session.params.isSeasonPack ? undefined : session.params.episodeNumber,
        isSeasonPack: session.params.isSeasonPack,
        qualityScore: chosenRelease.score,
        source: chosenRelease.indexer,
        resolution: chosenRelease.resolution,
      });

      if (!createRes.ok) {
        await this.telegram.editMessageText(
          chatId,
          messageId,
          `❌ Falha ao trocar release: ${createRes.error}`
        );
        return;
      }

      this.callbackStore.delete(token);
      const newCard = this.formatConfirmationCard(
        session.params.candidate,
        chosenRelease,
        session.params.seasonNumber,
        session.params.episodeNumber,
        session.params.isSeasonPack
      );

      await this.telegram.editMessageText(
        chatId,
        messageId,
        `✅ *Release alterado com sucesso!*\n\n${newCard}`
      );
    }
  }
}
