import { ParsedIntent, MediaType } from './types';

export interface IntentParserOptions {
  globalGeminiApiKey?: string;
}

const ORDINAL_MAP: Record<string, number> = {
  primeira: 1, '1ª': 1, '1a': 1, primeiro: 1, first: 1,
  segunda: 2, '2ª': 2, '2a': 2, segundo: 2, second: 2,
  terceira: 3, '3ª': 3, '3a': 3, terceiro: 3, third: 3,
  quarta: 4, '4ª': 4, '4a': 4, quarto: 4, fourth: 4,
  quinta: 5, '5ª': 5, '5a': 5, quinto: 5, fifth: 5,
  sexta: 6, '6ª': 6, '6a': 6, sexto: 6, sixth: 6,
  setima: 7, '7ª': 7, '7a': 7, sétimo: 7, sétima: 7, seventh: 7,
  oitava: 8, '8ª': 8, '8a': 8, oitavo: 8, eighth: 8,
  nona: 9, '9ª': 9, '9a': 9, nono: 9, ninth: 9,
  decima: 10, '10ª': 10, '10a': 10, décimo: 10, décima: 10, tenth: 10,
};

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
    let title = titleInput.trim();
    let seasonNumber: number | undefined;
    let episodeNumber: number | undefined;
    let isSeasonPack = false;
    let mediaType = defaultMediaType;

    // Check season pack indicators
    if (/(temporada\s+completa|season\s+pack|complete\s+season|todas\s+as\s+temporadas)/i.test(title)) {
      isSeasonPack = true;
      title = title.replace(/(temporada\s+completa|season\s+pack|complete\s+season|todas\s+as\s+temporadas)/gi, '').trim();
    }

    // Prefix season: e.g. "a primeira temporada de Aoashi" or "temporada 2 de Ruptura"
    const prefixSeasonRegex = /^(?:a\s+)?(?:(primeira|segunda|terceira|quarta|quinta|sexta|s[eé]tima|oitava|nona|d[eé]cima|\d+[ªa]|\d+)\s+temporada|temporada\s+(\d+|primeira|segunda|terceira|quarta|quinta|sexta|s[eé]tima|oitava|nona|d[eé]cima|\d+[ªa]))\s*(?:completa)?\s+(?:de|do|da)\s+(.+)$/i;
    const prefixMatch = title.match(prefixSeasonRegex);
    if (prefixMatch) {
      const rawSeason = (prefixMatch[1] || prefixMatch[2]).toLowerCase();
      seasonNumber = ORDINAL_MAP[rawSeason] || parseInt(rawSeason, 10);
      isSeasonPack = true;
      title = prefixMatch[3].trim();
      if (!mediaType) mediaType = 'tv_show';
    }

    // Prefix episode: e.g. "episodio 5 de Solo Leveling"
    const prefixEpRegex = /^(?:o\s+)?(?:(primeiro|segundo|terceiro|\d+[ºoa]|\d+)\s+(?:epis[oó]dio|ep)|(?:epis[oó]dio|ep)\s+(\d+))\s+(?:de|do|da)\s+(.+)$/i;
    const prefixEpMatch = title.match(prefixEpRegex);
    if (prefixEpMatch) {
      const rawEp = (prefixEpMatch[1] || prefixEpMatch[2]).toLowerCase();
      episodeNumber = ORDINAL_MAP[rawEp] || parseInt(rawEp, 10);
      title = prefixEpMatch[3].trim();
      if (!mediaType) mediaType = 'tv_show';
    }

    // Match S01E02 or s1e2 or 1x02
    const seMatch = title.match(/s(\d+)e(\d+)/i) || title.match(/(\d+)x(\d+)/i);
    if (seMatch) {
      seasonNumber = parseInt(seMatch[1], 10);
      episodeNumber = parseInt(seMatch[2], 10);
      title = title.replace(seMatch[0], '').trim();
      if (!mediaType) mediaType = 'tv_show';
    } else {
      // Match postfix "temporada 2" or "primeira temporada"
      if (!seasonNumber) {
        const postSeasonMatch =
          title.match(/(?:a\s+)?(primeira|segunda|terceira|quarta|quinta|sexta|s[eé]tima|oitava|nona|d[eé]cima|\d+[ªa])\s+temporada/i) ||
          title.match(/(?:temporada|season|temp\.?|t)\s*(\d+)/i);
        if (postSeasonMatch) {
          const raw = postSeasonMatch[1].toLowerCase();
          seasonNumber = ORDINAL_MAP[raw] || parseInt(raw, 10);
          title = title.replace(postSeasonMatch[0], '').trim();
          if (!mediaType) mediaType = 'tv_show';
        }
      }

      // Match postfix "episodio 3"
      if (!episodeNumber) {
        const postEpMatch = title.match(/(?:epis[oó]dio|ep)\s*(\d+)/i);
        if (postEpMatch) {
          episodeNumber = parseInt(postEpMatch[1], 10);
          title = title.replace(postEpMatch[0], '').trim();
          if (!mediaType) mediaType = 'tv_show';
        }
      }
    }

    // Clean punctuation or trailing dashes/quotes
    title = title.replace(/^[-–—:\s,]+|[-–—:\s,]+$/g, '').trim();
    title = title.replace(/^["'“”]+|["'“”]+$/g, '').trim();

    return {
      action: 'search',
      title: title || titleInput,
      mediaType,
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
    } catch (err) {
      console.warn('[IntentParser] Gemini API call threw an error:', err);
    }

    return this.heuristicFallback(text);
  }

  private heuristicFallback(text: string): ParsedIntent {
    let cleaned = text.trim();

    // 1. Strip common conversational greetings/fillers at start:
    cleaned = cleaned.replace(/^(?:ol[aá]|oi|e\s+a[ií]|ei|por\s+favor|pfv|bot|mdm)[,\s]*/i, '');

    // 2. Strip conversational verbs and intent phrases:
    cleaned = cleaned.replace(
      /^(?:baixa|baixe|baixar|baixem|pega|pegue|pegar|puxa|puxe|puxar|busca|busque|buscar|procura|procure|procurar|pesquisa|pesquise|pesquisar|encontra|encontre|encontrar|adiciona|adicione|adicionar|coloca|coloque|colocar|bota|bote|botar|quero\s+(?:ver|assistir|baixar)?|gostaria\s+de\s+(?:ver|assistir|baixar)?|fa[çc]a\s+o\s+download(?:\s+d[aeo]s?)?|faz\s+o\s+download(?:\s+d[aeo]s?)?|download(?:\s+d[aeo]s?)?|get)\s*(?:a[ií]|pra\s+mim|para\s+mim)?\s+/i,
      ''
    );

    // 3. Detect and strip mediaType descriptor:
    let mediaType: MediaType | undefined;

    if (/^(?:o\s+anime|um\s+anime|anime)\s+/i.test(cleaned)) {
      mediaType = 'anime';
      cleaned = cleaned.replace(/^(?:o\s+anime|um\s+anime|anime)\s+/i, '');
    } else if (/^(?:a\s+s[eé]rie|uma\s+s[eé]rie|s[eé]rie|o\s+seriado|seriado)\s+/i.test(cleaned)) {
      mediaType = 'tv_show';
      cleaned = cleaned.replace(/^(?:a\s+s[eé]rie|uma\s+s[eé]rie|s[eé]rie|o\s+seriado|seriado)\s+/i, '');
    } else if (/^(?:o\s+filme|um\s+filme|filme|o\s+longa|longa)\s+/i.test(cleaned)) {
      mediaType = 'movie';
      cleaned = cleaned.replace(/^(?:o\s+filme|um\s+filme|filme|o\s+longa|longa)\s+/i, '');
    }

    if (!mediaType && /\banime\b/i.test(cleaned)) {
      mediaType = 'anime';
      cleaned = cleaned.replace(/\b(?:o\s+anime|anime)\s*/gi, ' ').trim();
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

    const candidateModels = Array.from(
      new Set([
        ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-3-flash-preview',
      ])
    );

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          console.warn(`[IntentParser] Gemini API (${model}) returned status ${res.status}: ${errBody}`);
          // Fallback to next candidate model if 404, 429, 503, etc.
          continue;
        }

        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJson) continue;

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
      } catch (err) {
        console.warn(`[IntentParser] Error with model ${model}:`, err);
        continue;
      }
    }

    return null;
  }
}
