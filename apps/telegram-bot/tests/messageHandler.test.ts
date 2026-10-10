import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageHandler } from '../src/messageHandler';
import { TelegramBotClient } from '../src/telegramClient';
import { MdmApiClient } from '../src/apiClient';
import { IntentParser } from '../src/intentParser';
import { CallbackStore } from '../src/callbackStore';
import { CarouselHandler } from '../src/carouselHandler';
import { EpisodicHandler } from '../src/episodicHandler';
import { SnatchHandler } from '../src/snatchHandler';
import { TelegramMessage } from '../src/types';

describe('MessageHandler', () => {
  let telegramMock: Partial<TelegramBotClient>;
  let apiClientMock: Partial<MdmApiClient>;
  let intentParserMock: Partial<IntentParser>;
  let callbackStore: CallbackStore;
  let carouselMock: Partial<CarouselHandler>;
  let episodicMock: Partial<EpisodicHandler>;
  let snatchMock: Partial<SnatchHandler>;
  let messageHandler: MessageHandler;

  beforeEach(() => {
    telegramMock = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
      editMessageText: vi.fn().mockResolvedValue(true),
      answerCallbackQuery: vi.fn().mockResolvedValue(true),
    };
    apiClientMock = {
      getUserByChatId: vi.fn(),
      pairUser: vi.fn(),
      getTelegramConfig: vi.fn().mockResolvedValue({ globalGeminiApiKey: true }),
      setUserGeminiApiKey: vi.fn().mockResolvedValue(true),
      searchMetadata: vi.fn().mockResolvedValue([]),
    };
    intentParserMock = {
      parseIntent: vi.fn().mockResolvedValue({
        action: 'search',
        title: 'Lanternas',
        mediaType: 'tv_show',
      }),
    };
    callbackStore = new CallbackStore();
    carouselMock = {
      sendCarousel: vi.fn().mockResolvedValue(undefined),
      handleCarouselCallback: vi.fn().mockResolvedValue(undefined),
    };
    episodicMock = {
      promptEpisodicChoice: vi.fn().mockResolvedValue(undefined),
      handleEpisodicCallback: vi.fn().mockResolvedValue(undefined),
    };
    snatchMock = {
      executeSnatch: vi.fn().mockResolvedValue(undefined),
      handleReleaseCallback: vi.fn().mockResolvedValue(undefined),
    };

    messageHandler = new MessageHandler(
      telegramMock as TelegramBotClient,
      apiClientMock as MdmApiClient,
      intentParserMock as IntentParser,
      callbackStore,
      carouselMock as CarouselHandler,
      episodicMock as EpisodicHandler,
      snatchMock as SnatchHandler
    );
  });

  it('prompts unpaired users with pairing instructions', async () => {
    (apiClientMock.getUserByChatId as any).mockResolvedValue(null);

    const msg: TelegramMessage = {
      message_id: 1,
      chat: { id: 12345, type: 'private' },
      date: Date.now(),
      text: 'Baixe um filme',
    };

    await messageHandler.handleMessage(msg);

    expect(telegramMock.sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text] = (telegramMock.sendMessage as any).mock.calls[0];
    expect(chatId).toBe(12345);
    expect(text).toContain('Bem-vindo ao Media Download Manager');
    expect(text).toContain('/link <SEU_CODIGO>');
  });

  it('pairs user when unpaired user sends /link <code>', async () => {
    (apiClientMock.getUserByChatId as any).mockResolvedValue(null);
    (apiClientMock.pairUser as any).mockResolvedValue({
      ok: true,
      user: { id: 'u1', username: 'bob', role: 'user' },
    });

    const msg: TelegramMessage = {
      message_id: 1,
      chat: { id: 12345, type: 'private' },
      date: Date.now(),
      text: '/link 456DEF',
    };

    await messageHandler.handleMessage(msg);

    expect(apiClientMock.pairUser).toHaveBeenCalledWith('456DEF', 12345);
    expect(telegramMock.sendMessage).toHaveBeenCalledTimes(1);
    const [, text] = (telegramMock.sendMessage as any).mock.calls[0];
    expect(text).toContain('Conta Vinculada com Sucesso');
    expect(text).toContain('bob');
  });

  it('handles /status for paired user', async () => {
    (apiClientMock.getUserByChatId as any).mockResolvedValue({
      id: 'u1',
      username: 'alice',
      role: 'admin',
    });

    const msg: TelegramMessage = {
      message_id: 1,
      chat: { id: 12345, type: 'private' },
      date: Date.now(),
      text: '/status',
    };

    await messageHandler.handleMessage(msg);

    expect(telegramMock.sendMessage).toHaveBeenCalledTimes(1);
    const [, text] = (telegramMock.sendMessage as any).mock.calls[0];
    expect(text).toContain('alice');
    expect(text).toContain('admin');
  });

  it('dispatches search to carousel for paired user', async () => {
    (apiClientMock.getUserByChatId as any).mockResolvedValue({
      id: 'u1',
      username: 'alice',
      role: 'admin',
    });
    (apiClientMock.searchMetadata as any).mockResolvedValue([
      { id: 99, title: 'Lanternas', mediaType: 'tv_show' },
    ]);

    const msg: TelegramMessage = {
      message_id: 1,
      chat: { id: 12345, type: 'private' },
      date: Date.now(),
      text: 'Baixe a serie Lanternas',
    };

    await messageHandler.handleMessage(msg);

    expect(intentParserMock.parseIntent).toHaveBeenCalledTimes(1);
    expect(apiClientMock.searchMetadata).toHaveBeenCalledWith('u1', 'Lanternas', 'tv_show');
    expect(carouselMock.sendCarousel).toHaveBeenCalledWith(
      12345,
      'u1',
      [{ id: 99, title: 'Lanternas', mediaType: 'tv_show' }],
      expect.objectContaining({ title: 'Lanternas' })
    );
  });
});
