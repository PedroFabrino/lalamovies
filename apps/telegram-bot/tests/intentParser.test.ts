import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntentParser } from '../src/intentParser';

describe('IntentParser', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Deterministic Slash Commands', () => {
    const parser = new IntentParser();

    it('parses /help and /start', () => {
      expect(parser.parseDeterministicSlashCommand('/start')?.action).toBe('help');
      expect(parser.parseDeterministicSlashCommand('/help')?.action).toBe('help');
    });

    it('parses /status', () => {
      expect(parser.parseDeterministicSlashCommand('/status')?.action).toBe('status');
    });

    it('parses /link and /vincular', () => {
      const res = parser.parseDeterministicSlashCommand('/link ABC123');
      expect(res?.action).toBe('link');
      expect(res?.arg).toBe('ABC123');

      const res2 = parser.parseDeterministicSlashCommand('/vincular XYZ789');
      expect(res2?.action).toBe('link');
      expect(res2?.arg).toBe('XYZ789');
    });

    it('parses /apikey', () => {
      const res = parser.parseDeterministicSlashCommand('/apikey AIzaSyTestKey');
      expect(res?.action).toBe('apikey');
      expect(res?.arg).toBe('AIzaSyTestKey');
    });

    it('parses /filme with movie mediaType', () => {
      const res = parser.parseDeterministicSlashCommand('/filme Inception');
      expect(res?.action).toBe('search');
      expect(res?.mediaType).toBe('movie');
      expect(res?.title).toBe('Inception');
    });

    it('parses /serie with S01E02 format', () => {
      const res = parser.parseDeterministicSlashCommand('/serie Lanterns S01E02');
      expect(res?.action).toBe('search');
      expect(res?.mediaType).toBe('tv_show');
      expect(res?.title).toBe('Lanterns');
      expect(res?.seasonNumber).toBe(1);
      expect(res?.episodeNumber).toBe(2);
      expect(res?.isSeasonPack).toBe(false);
    });

    it('parses /serie with Portuguese text "temporada 2 episódio 3"', () => {
      const res = parser.parseDeterministicSlashCommand('/serie Severance temporada 2 episódio 3');
      expect(res?.action).toBe('search');
      expect(res?.mediaType).toBe('tv_show');
      expect(res?.title).toBe('Severance');
      expect(res?.seasonNumber).toBe(2);
      expect(res?.episodeNumber).toBe(3);
    });

    it('parses /serie with "temporada completa"', () => {
      const res = parser.parseDeterministicSlashCommand('/serie The Bear temporada completa');
      expect(res?.action).toBe('search');
      expect(res?.mediaType).toBe('tv_show');
      expect(res?.title).toBe('The Bear');
      expect(res?.isSeasonPack).toBe(true);
    });

    it('parses /anime with episode number', () => {
      const res = parser.parseDeterministicSlashCommand('/anime Solo Leveling ep 12');
      expect(res?.action).toBe('search');
      expect(res?.mediaType).toBe('anime');
      expect(res?.title).toBe('Solo Leveling');
      expect(res?.episodeNumber).toBe(12);
    });

    it('returns null for freeform natural messages', () => {
      expect(parser.parseDeterministicSlashCommand('Baixe o filme Interestelar')).toBeNull();
    });
  });

  describe('Natural Language Intent with Gemini Flash', () => {
    it('uses Gemini Flash structured response when API key is available', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      action: 'search',
                      title: 'Lanternas',
                      mediaType: 'tv_show',
                      seasonNumber: 1,
                      episodeNumber: null,
                      isSeasonPack: false,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });
      global.fetch = fetchMock;

      const parser = new IntentParser({ globalGeminiApiKey: 'test-gemini-key' });
      const intent = await parser.parseIntent('Baixe a serie Lanternas');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(intent.action).toBe('search');
      expect(intent.title).toBe('Lanternas');
      expect(intent.mediaType).toBe('tv_show');
    });

    it('uses personal API key if global key is disabled and personal key provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      action: 'search',
                      title: 'Gladiador 2',
                      mediaType: 'movie',
                      seasonNumber: null,
                      episodeNumber: null,
                      isSeasonPack: false,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });
      global.fetch = fetchMock;

      const parser = new IntentParser({ globalGeminiApiKey: 'server-key' });
      const intent = await parser.parseIntent('Quero ver Gladiador 2', 'personal-user-key', false);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toContain('key=personal-user-key');
      expect(intent.title).toBe('Gladiador 2');
      expect(intent.mediaType).toBe('movie');
    });

    it('cascades from unavailable model (503/404) to next working model in candidates', async () => {
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        callCount++;
        if (url.includes('gemini-3.8-flash')) {
          return {
            ok: false,
            status: 503,
            text: async () => 'Model overloaded',
          };
        }
        if (url.includes('gemini-3.5-flash')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          action: 'search',
                          title: 'Aoashi',
                          mediaType: 'anime',
                          seasonNumber: 1,
                          episodeNumber: null,
                          isSeasonPack: true,
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404 };
      });
      global.fetch = fetchMock;

      const parser = new IntentParser({ globalGeminiApiKey: 'test-key' });
      const intent = await parser.parseIntent('Baixa Aoashi temporada 1');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toContain('gemini-3.8-flash');
      expect(fetchMock.mock.calls[1][0]).toContain('gemini-3.5-flash');
      expect(intent.title).toBe('Aoashi');
      expect(intent.mediaType).toBe('anime');
      expect(intent.isSeasonPack).toBe(true);
    });

    it('falls back to heuristic parsing when Gemini fails or returns error', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Gemini API Error'));
      global.fetch = fetchMock;

      const parser = new IntentParser({ globalGeminiApiKey: 'test-gemini-key' });
      const intent = await parser.parseIntent('Baixe o filme Interestelar');

      expect(intent.action).toBe('search');
      expect(intent.mediaType).toBe('movie');
      expect(intent.title).toBe('Interestelar');
    });

    it('falls back to heuristic parsing without API key', async () => {
      const parser = new IntentParser();
      const intent = await parser.parseIntent('Baixe a serie Shogun s01e01', null, false);

      expect(intent.action).toBe('search');
      expect(intent.mediaType).toBe('tv_show');
      expect(intent.title).toBe('Shogun');
      expect(intent.seasonNumber).toBe(1);
      expect(intent.episodeNumber).toBe(1);
    });

    it('parses informal imperative "Baixa o anime A certain dark item"', async () => {
      const parser = new IntentParser();
      const intent = await parser.parseIntent('Baixa o anime A certain dark item', null, false);

      expect(intent.action).toBe('search');
      expect(intent.title).toBe('A certain dark item');
      expect(intent.mediaType).toBe('anime');
    });

    it('parses direct show title "A certain dark item" with undefined mediaType', async () => {
      const parser = new IntentParser();
      const intent = await parser.parseIntent('A certain dark item', null, false);

      expect(intent.action).toBe('search');
      expect(intent.title).toBe('A certain dark item');
      expect(intent.mediaType).toBeUndefined();
    });

    it('parses "Baixa a primeira temporada de Aoashi" with season 1 and pack mode', async () => {
      const parser = new IntentParser();
      const intent = await parser.parseIntent('Baixa a primeira temporada de Aoashi', null, false);

      expect(intent.action).toBe('search');
      expect(intent.title).toBe('Aoashi');
      expect(intent.mediaType).toBe('tv_show');
      expect(intent.seasonNumber).toBe(1);
      expect(intent.isSeasonPack).toBe(true);
    });

    it('parses "Baixa a 2ª temporada de Ruptura"', async () => {
      const parser = new IntentParser();
      const intent = await parser.parseIntent('Baixa a 2ª temporada de Ruptura', null, false);

      expect(intent.action).toBe('search');
      expect(intent.title).toBe('Ruptura');
      expect(intent.mediaType).toBe('tv_show');
      expect(intent.seasonNumber).toBe(2);
      expect(intent.isSeasonPack).toBe(true);
    });

    it('parses "Baixa episódio 5 de Solo Leveling"', async () => {
      const parser = new IntentParser();
      const intent = await parser.parseIntent('Baixa episódio 5 de Solo Leveling', null, false);

      expect(intent.action).toBe('search');
      expect(intent.title).toBe('Solo Leveling');
      expect(intent.mediaType).toBe('tv_show');
      expect(intent.episodeNumber).toBe(5);
    });
  });
});
