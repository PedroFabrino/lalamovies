import { ParsedIntent, MediaType } from './types';

export interface IntentParserOptions {
  globalGeminiApiKey?: string;
}

export class IntentParser {
  private globalGeminiApiKey?: string;

  constructor(options?: IntentParserOptions) {
    this.globalGeminiApiKey = options?.globalGeminiApiKey || process.env.GEMINI_API_KEY;
  }

  parseDeterministicSlashCommand(text: string): ParsedIntent | null {
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) {
      return null;
    }

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const rest = parts.slice(1).join(' ').trim();

    if (cmd === '/start' || cmd === '/help') {
      return { action: 'help', raw: text };
    }

    if (cmd === '/status') {
      return { action: 'status', raw: text };
    }

    if (cmd === '/link' || cmd === '/vincular') {
      return { action: 'link', arg: rest, raw: text };
    }

    if (cmd === '/apikey' || cmd === '/chave') {
      return { action: 'apikey', arg: rest, raw: text };
    }

    if (cmd === '/filme') {
      return { action: 'search', mediaType: 'movie', title: rest, raw: text };
    }

    if (cmd === '/serie') {
      return this.extractEpisodicInfo(rest, 'tv_show', text);
    }

    if (cmd === '/anime') {
      return this.extractEpisodicInfo(rest, 'anime', text);
    }

    if (cmd === '/baixar' || cmd === '/download') {
      return this.extractEpisodicInfo(rest, undefined, text);
    }

    return null;
  }

  extractEpisodicInfo(titleInput: string, defaultMediaType?: MediaType, rawText?: string): ParsedIntent {
    let title = titleInput;
    let seasonNumber: number | undefined;
    let episodeNumber: number | undefined;
    let isSeasonPack = false;

    // Check season pack indicators
    if (/(temporada\s+completa|season\s+pack|complete\s+season)/i.test(title)) {
      isSeasonPack = true;
      title = title.replace(/(temporada\s+completa|season\s+pack|complete\s+season)/gi, '').trim();
    }

    // Match S01E02 or s1e2 or 1x02
    const seMatch = title.match(/s(\d+)e(\d+)/i) || title.match(/(\d+)x(\d+)/i);
    if (seMatch) {
      seasonNumber = parseInt(seMatch[1], 10);
      episodeNumber = parseInt(seMatch[2], 10);
      title = title.replace(seMatch[0], '').trim();
    } else {
      // Match "temporada 2 episodio 3"
      const tempMatch = title.match(/temporada\s+(\d+)/i);
      if (tempMatch) {
        seasonNumber = parseInt(tempMatch[1], 10);
        title = title.replace(tempMatch[0], '').trim();
      }
      const epMatch = title.match(/(?:epis[oó]dio|ep)\s+(\d+)/i);
      if (epMatch) {
        episodeNumber = parseInt(epMatch[1], 10);
        title = title.replace(epMatch[0], '').trim();
      }
    }

    // Clean punctuation or trailing dashes
    title = title.replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();

    return {
      action: 'search',
      title: title || titleInput,
      mediaType: defaultMediaType,
      seasonNumber,
      episodeNumber,
      isSeasonPack,
      raw: rawText || titleInput,
    };
  }

  async parseIntent(
    text: string,
    userApiKey?: string | null,
    globalKeyEnabled: boolean = true
  ): Promise<ParsedIntent> {
    const slashResult = this.parseDeterministicSlashCommand(text);
    if (slashResult) {
      return slashResult;
    }

    // Determine Gemini API key
    const effectiveKey = (globalKeyEnabled ? this.globalGeminiApiKey : undefined) || userApiKey || this.globalGeminiApiKey;

    if (!effectiveKey || !effectiveKey.trim()) {
      // Heuristic fallback without Gemini
      return this.heuristicFallback(text);
    }

    try {
      const response = await this.callGeminiFlash(text, effectiveKey.trim());
      if (response) {
        return response;
      }
    } catch {
      // Fallback on LLM failure
    }

    return this.heuristicFallback(text);
  }

  private heuristicFallback(text: string): ParsedIntent {
    let cleaned = text.trim();
    // Strip common conversational openers
    cleaned = cleaned.replace(/^(?:por\s+favor\s+)?(?:baixe|baixar|quero\s+ver|coloque|fa[çc]a\s+o\s+download\s+d[aeo]?|procure|busca|pesquise)\s+/i, '');
    let mediaType: MediaType | undefined;

    if (/^(?:o\s+filme|filme)\s+/i.test(cleaned)) {
      mediaType = 'movie';
      cleaned = cleaned.replace(/^(?:o\s+filme|filme)\s+/i, '');
    } else if (/^(?:a\s+s[eé]rie|s[eé]rie)\s+/i.test(cleaned)) {
      mediaType = 'tv_show';
      cleaned = cleaned.replace(/^(?:a\s+s[eé]rie|s[eé]rie)\s+/i, '');
    } else if (/^(?:o\s+anime|anime)\s+/i.test(cleaned)) {
      mediaType = 'anime';
      cleaned = cleaned.replace(/^(?:o\s+anime|anime)\s+/i, '');
    }

    return this.extractEpisodicInfo(cleaned, mediaType, text);
  }

  private async callGeminiFlash(prompt: string, apiKey: string): Promise<ParsedIntent | null> {
    const systemPrompt = `You are a media request intent parser. Analyze the user message and extract the desired movie, TV show, or anime to download.
Return ONLY valid JSON matching this schema:
{
  "action": "search" | "status" | "help" | "unknown",
  "title": string | null,
  "mediaType": "movie" | "tv_show" | "anime" | null,
  "seasonNumber": number | null,
  "episodeNumber": number | null,
  "isSeasonPack": boolean
}
Clean the title of words like "baixe", "quero", "download", "por favor". If the user is greeting or asking for instructions, action is "help".`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return null;

    const parsed = JSON.parse(rawJson);
    return {
      action: parsed.action || 'search',
      title: parsed.title || undefined,
      mediaType: parsed.mediaType || undefined,
      seasonNumber: typeof parsed.seasonNumber === 'number' ? parsed.seasonNumber : undefined,
      episodeNumber: typeof parsed.episodeNumber === 'number' ? parsed.episodeNumber : undefined,
      isSeasonPack: Boolean(parsed.isSeasonPack),
      raw: prompt,
    };
  }
}
