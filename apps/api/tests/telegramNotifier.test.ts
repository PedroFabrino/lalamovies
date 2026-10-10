import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelegramNotifier } from '../src/services/telegramNotifier';

describe('TelegramNotifier', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('does nothing if no bot token is provided', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const notifier = new TelegramNotifier();
    await notifier.send('download.completed', {
      title: 'Lanterns',
      telegramChatId: '12345',
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing if chatId cannot be resolved', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const notifier = new TelegramNotifier('test-token');
    await notifier.send('download.completed', {
      title: 'Lanterns',
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores non-lifecycle events like cleanup.scheduled', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const notifier = new TelegramNotifier('test-token');
    await notifier.send('cleanup.scheduled', {
      title: 'Lanterns',
      telegramChatId: '12345',
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves chatId via getUserTelegramChatId when only userId is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock;

    const getUserTelegramChatId = vi.fn().mockResolvedValue('chat-999');
    const notifier = new TelegramNotifier('test-token', getUserTelegramChatId);

    await notifier.send('download.completed', {
      title: 'Lanterns',
      userId: 'user-1',
      mediaType: 'tv_show',
      seasonNumber: 1,
      episodeNumber: 1,
      jellyfinUrl: 'https://jellyfin.example.com',
    });

    expect(getUserTelegramChatId).toHaveBeenCalledWith('user-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, req] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottest-token/sendMessage');
    const body = JSON.parse(req.body);
    expect(body.chat_id).toBe('chat-999');
    expect(body.text).toContain('Lanterns - S01E01');
    expect(body.text).toContain('Download Concluído!');
    expect(body.text).toContain('https://jellyfin.example.com');
  });

  it('sends stream.ready notification correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock;

    const notifier = new TelegramNotifier('test-token');
    await notifier.send('stream.ready', {
      title: 'Inception',
      mediaType: 'movie',
      year: 2010,
      telegramChatId: '12345',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.chat_id).toBe('12345');
    expect(body.text).toContain('Stream Instantâneo Pronto!');
    expect(body.text).toContain('Inception (2010)');
  });

  it('sends download.failed notification with error details', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock;

    const notifier = new TelegramNotifier('test-token');
    await notifier.send('download.failed', {
      title: 'Failed Movie',
      error: 'Torrent stalled or timeout',
      telegramChatId: '12345',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.chat_id).toBe('12345');
    expect(body.text).toContain('Falha no Download');
    expect(body.text).toContain('Torrent stalled or timeout');
  });

  it('handles Telegram API error responses without throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });
    global.fetch = fetchMock;

    const notifier = new TelegramNotifier('test-token');
    await expect(
      notifier.send('download.completed', {
        title: 'Lanterns',
        telegramChatId: '12345',
      })
    ).resolves.not.toThrow();
  });

  it('handles fetch exceptions gracefully without throwing', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = fetchMock;

    const notifier = new TelegramNotifier('test-token');
    await expect(
      notifier.send('download.completed', {
        title: 'Lanterns',
        telegramChatId: '12345',
      })
    ).resolves.not.toThrow();
  });
});
