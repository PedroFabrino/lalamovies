import {
  MetadataCandidate,
  ReleaseCandidate,
  InlineKeyboardMarkup,
} from './types';
import { TelegramBotClient } from './telegramClient';
import { CallbackStore } from './callbackStore';
import { MdmApiClient } from './apiClient';
import { ReportCardHandler } from './reportCardHandler';
import {
  formatBytes,
  formatMediaSubtitle,
  formatConfirmationCard,
} from './snatchFormatters';

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

export interface WaitlistSession {
  chatId: number | string;
  userId: string;
  candidate: MetadataCandidate;
  seasonNumber?: number;
  episodeNumber?: number;
  isSeasonPack?: boolean;
  watchNext?: boolean;
}

export class SnatchHandler {
  constructor(
    private telegram: TelegramBotClient,
    private apiClient: MdmApiClient,
    private callbackStore: CallbackStore,
    private reportCardHandler?: ReportCardHandler
  ) {}

  formatBytes(bytes: number): string {
    return formatBytes(bytes);
  }

  formatMediaSubtitle(
    seasonNumber?: number,
    episodeNumber?: number,
    isSeasonPack?: boolean
  ): string {
    return formatMediaSubtitle(seasonNumber, episodeNumber, isSeasonPack);
  }

  formatConfirmationCard(
    candidate: MetadataCandidate,
    release: ReleaseCandidate,
    seasonNumber?: number,
    episodeNumber?: number,
    isSeasonPack?: boolean,
    watchNext?: boolean
  ): string {
    return formatConfirmationCard(candidate, release, seasonNumber, episodeNumber, isSeasonPack, watchNext);
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
      seasonNumber,
      episodeNumber: isSeasonPack ? undefined : episodeNumber,
      isSeasonPack,
      romajiTitle: candidate.romajiTitle,
      englishTitle: candidate.englishTitle,
    });

    if (searchRes.isFutureOrUnreleased || searchRes.releases.length === 0) {
      const waitlistSession: WaitlistSession = {
        chatId,
        userId,
        candidate,
        seasonNumber,
        episodeNumber,
        isSeasonPack,
        watchNext: params.watchNext,
      };
      const token = this.callbackStore.save(waitlistSession);
      const subTitle = this.formatMediaSubtitle(seasonNumber, episodeNumber, isSeasonPack);

      const promptText =
        `⚠️ *Nenhum release encontrado para "${candidate.title}${subTitle}".*\n\n` +
        `Este conteúdo pode ainda não ter sido lançado ou não possui sementes ativas no momento.\n\n` +
        `Deseja adicioná-lo à *Waitlist* para monitoramento automático?`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '⏳ Adicionar à Waitlist', callback_data: `w:${token}:confirm` },
            { text: '❌ Não', callback_data: `w:${token}:cancel` },
          ],
        ],
      };

      if (waitMsg) {
        await this.telegram.editMessageText(chatId, waitMsg.message_id, promptText, {
          replyMarkup: keyboard,
        });
      } else {
        await this.telegram.sendMessage(chatId, promptText, { replyMarkup: keyboard });
      }
      return;
    }

    const selectedRelease = searchRes.recommendedRelease || searchRes.releases[0];
    const createRes = await this.apiClient.createRequest(userId, {
      title: candidate.title,
      mediaType: candidate.mediaType,
      downloadUrl: selectedRelease.downloadUrl,
      infoHash: selectedRelease.infoHash,
      metadataId: String(candidate.id),
      metadataSource: 'tmdb',
      year: candidate.year,
      seasonNumber,
      episodeNumber: isSeasonPack ? undefined : episodeNumber,
      isSeasonPack,
      waitlistNextSeason: isSeasonPack && params.watchNext ? true : undefined,
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

    if (!isSeasonPack && params.watchNext && ['tv_show', 'anime'].includes(candidate.mediaType)) {
      const currentEp = episodeNumber ?? 1;
      await this.apiClient
        .createWaitlist(userId, {
          title: candidate.title,
          mediaType: candidate.mediaType,
          metadataId: candidate.id,
          metadataSource: 'tmdb',
          year: candidate.year,
          seasonNumber: seasonNumber ?? 1,
          targetEpisode: currentEp + 1,
          posterUrl: candidate.posterUrl,
        })
        .catch(() => {});
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
      isSeasonPack,
      params.watchNext
    );

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🔍 Escolher Outro Release', callback_data: `r:${token}:menu` }],
      ],
    };

    let snatchMsgId: number | undefined;
    if (waitMsg) {
      await this.telegram.editMessageText(chatId, waitMsg.message_id, cardText, {
        replyMarkup: keyboard,
      });
      snatchMsgId = waitMsg.message_id;
    } else {
      const sent = await this.telegram.sendMessage(chatId, cardText, { replyMarkup: keyboard });
      snatchMsgId = sent?.message_id;
    }

    if (snatchMsgId) {
      this.callbackStore.setLastEphemeralMessage(chatId, snatchMsgId);
      if (createRes.id) {
        await this.apiClient.setRequestSnatchMessageId(createRes.id, snatchMsgId);
      }
    }

    if (this.reportCardHandler) {
      await this.reportCardHandler.ensureOrUpdateReportCard(chatId).catch(() => {});
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
        metadataId: String(session.params.candidate.id),
        metadataSource: 'tmdb',
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

  async handleWaitlistCallback(
    chatId: number | string,
    messageId: number,
    action: string,
    token: string
  ): Promise<void> {
    const session = this.callbackStore.get<WaitlistSession>(token);
    if (!session) {
      await this.telegram.editMessageText(chatId, messageId, '⚠️ Sessão da waitlist expirada.');
      return;
    }

    if (action === 'cancel') {
      this.callbackStore.delete(token);
      await this.telegram.editMessageText(
        chatId,
        messageId,
        `❌ *Operação cancelada.*\nO item não foi adicionado à waitlist.`
      );
      return;
    }

    if (action === 'confirm') {
      const waitlistRes = await this.apiClient.createWaitlist(session.userId, {
        title: session.candidate.title,
        mediaType: session.candidate.mediaType,
        metadataId: String(session.candidate.id),
        metadataSource: 'tmdb',
        posterUrl: session.candidate.posterUrl,
        year: session.candidate.year,
        seasonNumber: session.seasonNumber,
        targetEpisode: session.isSeasonPack ? undefined : session.episodeNumber,
        waitlistNextSeason: session.watchNext,
      });

      this.callbackStore.delete(token);

      if (waitlistRes.ok) {
        const subTitle = this.formatMediaSubtitle(
          session.seasonNumber,
          session.episodeNumber,
          session.isSeasonPack
        );
        await this.telegram.editMessageText(
          chatId,
          messageId,
          `⏳ *Adicionado à Waitlist!*\n\n` +
            `*${session.candidate.title}${subTitle}*\n\n` +
            `O MDM monitorará automaticamente e iniciará o download assim que um release compatível for publicado.`
        );
      } else {
        await this.telegram.editMessageText(
          chatId,
          messageId,
          `❌ Não foi possível adicionar à waitlist: ${waitlistRes.message || 'Erro desconhecido'}`
        );
      }
    }
  }
}

