import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CarouselHandler } from '../src/carouselHandler';
import { CallbackStore } from '../src/callbackStore';
import { TelegramBotClient } from '../src/telegramClient';
import { MetadataCandidate } from '../src/types';

describe('CarouselHandler', () => {
  let telegramMock: Partial<TelegramBotClient>;
  let callbackStore: CallbackStore;
  let carousel: CarouselHandler;

  const mockCandidates: MetadataCandidate[] = [
    {
      id: 101,
      title: 'Lanterns',
      mediaType: 'tv_show',
      year: 2026,
      posterUrl: 'https://image.tmdb.org/t/p/w500/lanterns.jpg',
      overview: 'Two intergalactic cops investigating a dark mystery on Earth.',
    },
    {
      id: 102,
      title: 'Green Lantern: First Flight',
      mediaType: 'movie',
      year: 2009,
      posterUrl: 'https://image.tmdb.org/t/p/w500/firstflight.jpg',
      overview: 'Hal Jordan gets chosen to become a Green Lantern.',
    },
  ];

  beforeEach(() => {
    telegramMock = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
      sendPhoto: vi.fn().mockResolvedValue({ message_id: 2 }),
      editMessageMedia: vi.fn().mockResolvedValue(true),
      editMessageCaption: vi.fn().mockResolvedValue(true),
      editMessageText: vi.fn().mockResolvedValue(true),
    };
    callbackStore = new CallbackStore();
    carousel = new CarouselHandler(telegramMock as TelegramBotClient, callbackStore);
  });

  it('sends photo carousel with navigation and selection buttons for candidates', async () => {
    await carousel.sendCarousel('chat-1', 'user-1', mockCandidates, { action: 'search', title: 'Lanterns' });

    expect(telegramMock.sendPhoto).toHaveBeenCalledTimes(1);
    const [chatId, photoUrl, caption, options] = (telegramMock.sendPhoto as any).mock.calls[0];
    expect(chatId).toBe('chat-1');
    expect(photoUrl).toBe(mockCandidates[0].posterUrl);
    expect(caption).toContain('Lanterns');
    expect(caption).toContain('Resultado 1 de 2');

    // First card has no "Anterior", only "Próximo"
    const buttons = options.replyMarkup.inline_keyboard;
    expect(buttons[0][0].text).toContain('Próximo');
    expect(buttons[1][0].text).toContain('Selecionar');
  });

  it('handles empty candidates with polite error message', async () => {
    await carousel.sendCarousel('chat-1', 'user-1', [], { action: 'search', title: 'Nonexistent' });

    expect(telegramMock.sendMessage).toHaveBeenCalledTimes(1);
    expect((telegramMock.sendMessage as any).mock.calls[0][1]).toContain('Nenhum resultado encontrado');
  });

  it('navigates next candidate and edits message media in place', async () => {
    const session = {
      chatId: 'chat-1',
      userId: 'user-1',
      candidates: mockCandidates,
      currentIndex: 0,
      intent: { action: 'search' as const, title: 'Lanterns' },
    };
    const token = callbackStore.save(session);

    const onSelect = vi.fn();
    await carousel.handleCarouselCallback('chat-1', 2, 'next', token, onSelect);

    expect(telegramMock.editMessageMedia).toHaveBeenCalledTimes(1);
    const [chatId, msgId, newPhoto, newCaption] = (telegramMock.editMessageMedia as any).mock.calls[0];
    expect(chatId).toBe('chat-1');
    expect(msgId).toBe(2);
    expect(newPhoto).toBe(mockCandidates[1].posterUrl);
    expect(newCaption).toContain('Green Lantern: First Flight');
    expect(newCaption).toContain('Resultado 2 de 2');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('triggers onSelect callback when user clicks pick', async () => {
    const session = {
      chatId: 'chat-1',
      userId: 'user-1',
      candidates: mockCandidates,
      currentIndex: 1,
      intent: { action: 'search' as const, title: 'Lanterns' },
    };
    const token = callbackStore.save(session);

    const onSelect = vi.fn().mockResolvedValue(undefined);
    await carousel.handleCarouselCallback('chat-1', 2, 'pick', token, onSelect);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(session, mockCandidates[1]);
  });
});
