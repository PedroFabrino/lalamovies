import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EpisodicHandler } from '../src/episodicHandler';
import { SnatchHandler } from '../src/snatchHandler';
import { CallbackStore } from '../src/callbackStore';
import { TelegramBotClient } from '../src/telegramClient';
import { MdmApiClient } from '../src/apiClient';
import { MetadataCandidate, ReleaseCandidate } from '../src/types';

describe('EpisodicHandler & SnatchHandler', () => {
  let telegramMock: Partial<TelegramBotClient>;
  let apiClientMock: Partial<MdmApiClient>;
  let callbackStore: CallbackStore;
  let episodicHandler: EpisodicHandler;
  let snatchHandler: SnatchHandler;

  const candidate: MetadataCandidate = {
    id: 456,
    title: 'Lanternas',
    mediaType: 'tv_show',
    year: 2026,
  };

  const releases: ReleaseCandidate[] = [
    {
      title: 'Lanterns.S01E01.1080p.WEB-DL.DDP5.1.Atmos.H.264',
      downloadUrl: 'magnet:?xt=urn:btih:alpha',
      indexer: 'TorrentLeech',
      sizeBytes: 2.4 * 1024 * 1024 * 1024,
      seeders: 50,
      resolution: '1080p',
      score: 95,
    },
    {
      title: 'Lanterns.S01E01.2160p.4K.WEB-DL.HDR.H.265',
      downloadUrl: 'magnet:?xt=urn:btih:beta',
      indexer: 'FileList',
      sizeBytes: 12.1 * 1024 * 1024 * 1024,
      seeders: 30,
      resolution: '4K',
      score: 90,
    },
  ];

  beforeEach(() => {
    telegramMock = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 10 }),
      editMessageText: vi.fn().mockResolvedValue(true),
      deleteMessage: vi.fn().mockResolvedValue(true),
    };
    apiClientMock = {
      getSeriesProgress: vi.fn().mockResolvedValue({
        hasProgress: true,
        suggestedSeason: 1,
        suggestedEpisode: 3,
      }),
      searchReleases: vi.fn().mockResolvedValue({
        recommendedRelease: releases[0],
        releases,
        isFutureOrUnreleased: false,
      }),
      createRequest: vi.fn().mockResolvedValue({ ok: true, id: 'req-123' }),
      createWaitlist: vi.fn().mockResolvedValue({ ok: true, message: 'Adicionado' }),
      setRequestSnatchMessageId: vi.fn().mockResolvedValue(true),
    };
    callbackStore = new CallbackStore();
    episodicHandler = new EpisodicHandler(
      telegramMock as TelegramBotClient,
      apiClientMock as MdmApiClient,
      callbackStore
    );
    snatchHandler = new SnatchHandler(
      telegramMock as TelegramBotClient,
      apiClientMock as MdmApiClient,
      callbackStore
    );
  });

  describe('EpisodicHandler', () => {
    it('queries series progress and suggests next un-downloaded episode', async () => {
      const onReady = vi.fn();
      await episodicHandler.promptEpisodicChoice(
        'chat-1',
        'user-1',
        candidate,
        { action: 'search', title: 'Lanternas' },
        onReady
      );

      expect(apiClientMock.getSeriesProgress).toHaveBeenCalledWith('user-1', 456, 'Lanternas');
      expect(telegramMock.sendMessage).toHaveBeenCalledTimes(1);
      const [chatId, text, options] = (telegramMock.sendMessage as any).mock.calls[0];
      expect(chatId).toBe('chat-1');
      expect(text).toContain('Episódio S01E03');
      expect(text).toContain('*Ativado*');

      const buttons = options.replyMarkup.inline_keyboard;
      expect(buttons[0][0].text).toContain('Temporada 1 Completa');
      expect(buttons[1][0].text).toContain('S01E03');
      expect(buttons[2][0].text).toContain('Acompanhar Novos Episódios: SIM');
    });

    it('toggles watch next episodes and updates message in place', async () => {
      const session = {
        chatId: 'chat-1',
        userId: 'user-1',
        candidate,
        intent: { action: 'search' as const, title: 'Lanternas' },
        seasonNumber: 1,
        episodeNumber: 3,
        isSeasonPack: false,
        watchNext: true,
      };
      const token = callbackStore.save(session);
      const onConfirm = vi.fn();

      await episodicHandler.handleEpisodicCallback('chat-1', 10, 'toggle_watch', token, onConfirm);

      expect(telegramMock.editMessageText).toHaveBeenCalledTimes(1);
      const [chatId, msgId, text, options] = (telegramMock.editMessageText as any).mock.calls[0];
      expect(chatId).toBe('chat-1');
      expect(msgId).toBe(10);
      expect(text).toContain('*Desativado*');
      expect(options.replyMarkup.inline_keyboard[2][0].text).toContain('NÃO');

      // Check stored session
      expect(callbackStore.get(token)).toMatchObject({ watchNext: false });
    });

    it('deletes episodic message and invokes onConfirm when user confirms', async () => {
      const session = {
        chatId: 'chat-1',
        userId: 'user-1',
        candidate,
        intent: { action: 'search' as const, title: 'Lanternas' },
        seasonNumber: 1,
        episodeNumber: 3,
        isSeasonPack: false,
        watchNext: true,
      };
      const token = callbackStore.save(session);
      const onConfirm = vi.fn();

      await episodicHandler.handleEpisodicCallback('chat-1', 20, 'confirm', token, onConfirm);

      expect(telegramMock.deleteMessage).toHaveBeenCalledWith('chat-1', 20);
      expect(onConfirm).toHaveBeenCalledWith(session);
      expect(callbackStore.get(token)).toBeNull();
    });
  });

  describe('SnatchHandler', () => {
    it('automatically snatches top-scored release and sends confirmation card', async () => {
      await snatchHandler.executeSnatch({
        chatId: 'chat-1',
        userId: 'user-1',
        candidate,
        seasonNumber: 1,
        episodeNumber: 1,
        isSeasonPack: false,
      });

      expect(apiClientMock.searchReleases).toHaveBeenCalledWith('user-1', {
        title: 'Lanternas',
        mediaType: 'tv_show',
        year: 2026,
        seasonNumber: 1,
        episodeNumber: 1,
        isSeasonPack: false,
      });

      expect(apiClientMock.createRequest).toHaveBeenCalledTimes(1);
      const [userId, reqBody] = (apiClientMock.createRequest as any).mock.calls[0];
      expect(userId).toBe('user-1');
      expect(reqBody.title).toBe('Lanternas');
      expect(reqBody.downloadUrl).toBe(releases[0].downloadUrl);
      expect(reqBody.resolution).toBe('1080p');

      // Edits the waiting message with confirmation card
      expect(telegramMock.editMessageText).toHaveBeenCalledTimes(1);
      const [, , cardText, options] = (telegramMock.editMessageText as any).mock.calls[0];
      expect(cardText).toContain('Download Iniciado!');
      expect(cardText).toContain('TorrentLeech');
      expect(cardText).toContain('2.4 GB');
      expect(options.replyMarkup.inline_keyboard[0][0].text).toContain('Escolher Outro Release');
      expect(apiClientMock.setRequestSnatchMessageId).toHaveBeenCalledWith('req-123', 10);
      expect(callbackStore.getLastEphemeralMessage('chat-1')).toBe(10);
    });

    it('prompts user to add to waitlist when no releases are available or title is unreleased', async () => {
      (apiClientMock.searchReleases as any).mockResolvedValueOnce({
        releases: [],
        isFutureOrUnreleased: true,
      });

      await snatchHandler.executeSnatch({
        chatId: 'chat-1',
        userId: 'user-1',
        candidate,
        seasonNumber: 1,
        episodeNumber: 1,
        watchNext: true,
      });

      // Should not call createWaitlist automatically
      expect(apiClientMock.createWaitlist).not.toHaveBeenCalled();

      // Should prompt user with confirmation buttons
      expect(telegramMock.editMessageText).toHaveBeenCalledTimes(1);
      const [, , promptText, options] = (telegramMock.editMessageText as any).mock.calls[0];
      expect(promptText).toContain('Nenhum release encontrado para "Lanternas - S01E01"');
      expect(promptText).toContain('Deseja adicioná-lo à *Waitlist*');

      const buttons = options.replyMarkup.inline_keyboard[0];
      expect(buttons[0].text).toContain('Adicionar à Waitlist');
      expect(buttons[0].callback_data).toMatch(/^w:[a-f0-9]+:confirm$/);
      expect(buttons[1].text).toContain('Não');
      expect(buttons[1].callback_data).toMatch(/^w:[a-f0-9]+:cancel$/);
    });

    it('adds to waitlist when user confirms callback', async () => {
      const token = callbackStore.save({
        chatId: 'chat-1',
        userId: 'user-1',
        candidate,
        seasonNumber: 1,
        episodeNumber: 1,
        watchNext: true,
      });

      await snatchHandler.handleWaitlistCallback('chat-1', 10, 'confirm', token);

      expect(apiClientMock.createWaitlist).toHaveBeenCalledTimes(1);
      const [userId, wlBody] = (apiClientMock.createWaitlist as any).mock.calls[0];
      expect(userId).toBe('user-1');
      expect(wlBody.title).toBe('Lanternas');
      expect(wlBody.metadataId).toBe('456');
      expect(wlBody.targetEpisode).toBe(1);
      expect(wlBody.waitlistNextSeason).toBe(true);

      expect(telegramMock.editMessageText).toHaveBeenCalledTimes(1);
      const [, , cardText] = (telegramMock.editMessageText as any).mock.calls[0];
      expect(cardText).toContain('Adicionado à Waitlist!');
      expect(callbackStore.get(token)).toBeNull();
    });

    it('cancels waitlist addition when user cancels callback', async () => {
      const token = callbackStore.save({
        chatId: 'chat-1',
        userId: 'user-1',
        candidate,
        seasonNumber: 1,
        episodeNumber: 1,
      });

      await snatchHandler.handleWaitlistCallback('chat-1', 10, 'cancel', token);

      expect(apiClientMock.createWaitlist).not.toHaveBeenCalled();
      expect(telegramMock.editMessageText).toHaveBeenCalledTimes(1);
      const [, , cancelText] = (telegramMock.editMessageText as any).mock.calls[0];
      expect(cancelText).toContain('Operação cancelada');
      expect(callbackStore.get(token)).toBeNull();
    });

    it('displays manual override menu and replaces release on user selection', async () => {
      const session = {
        chatId: 'chat-1',
        userId: 'user-1',
        params: {
          chatId: 'chat-1',
          userId: 'user-1',
          candidate,
          seasonNumber: 1,
          episodeNumber: 1,
        },
        releases,
        activeRequestId: 'req-123',
      };
      const token = callbackStore.save(session);

      // Open override menu
      await snatchHandler.handleReleaseCallback('chat-1', 10, 'menu', token);
      expect(telegramMock.editMessageText).toHaveBeenCalledTimes(1);
      const [, , menuText, menuOptions] = (telegramMock.editMessageText as any).mock.calls[0];
      expect(menuText).toContain('Selecione um release alternativo');
      expect(menuOptions.replyMarkup.inline_keyboard).toHaveLength(3); // 2 releases + Voltar

      // User selects second release (4K)
      await snatchHandler.handleReleaseCallback('chat-1', 10, 'pick_1', token);
      expect(apiClientMock.createRequest).toHaveBeenCalledTimes(1);
      const [, newReq] = (apiClientMock.createRequest as any).mock.calls[0];
      expect(newReq.downloadUrl).toBe(releases[1].downloadUrl);
      expect(newReq.resolution).toBe('4K');
    });
  });
});
