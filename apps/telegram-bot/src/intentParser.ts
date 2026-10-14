import { ParsedIntent, MediaType } from './types';
import { extractEpisodicInfo, heuristicFallback } from './heuristicParser';

export interface IntentParserOptions {
  globalGeminiApiKey?: string;
  omnirouteUrl?: string;
}

export class IntentParser {
  private globalGeminiApiKey?: string;
  private omnirouteUrl?: string;

  constructor(options?: IntentParserOptions) {
    this.globalGeminiApiKey = options?.globalGeminiApiKey || process.env.GEMINI_API_KEY;
    this.omnirouteUrl = options?.omnirouteUrl || process.env.OMNIROUTE_URL;
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

    if (cmd === '/baixar' || cmd === '/baixe' || cmd === '/baixa' || cmd === '/download') {
      return this.extractEpisodicInfo(rest, undefined, text);
    }

    return null;
  }

  extractEpisodicInfo(titleInput: string, defaultMediaType?: MediaType, rawText?: string): ParsedIntent {
    return extractEpisodicInfo(titleInput, defaultMediaType, rawText);
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
      return heuristicFallback(text);
    }

    // Attempt Gemini Flash first
    try {
      const response = await this.callGeminiFlash(text, effectiveKey.trim());
      if (response) {
        return response;
      }
    } catch (err) {
      console.warn('[IntentParser] Gemini API call threw an error:', err);
    }

    // When Gemini is spiked/unavailable, try OmniRoute as fallback
    try {
      const omniResponse = await this.callOmniRouteFallback(text);
      if (omniResponse) {
        return omniResponse;
      }
    } catch (err) {
      console.warn('[IntentParser] OmniRoute fallback threw an error:', err);
    }

    // Both Gemini and OmniRoute failed or are unavailable
    const fallback = heuristicFallback(text);
    return {
      ...fallback,
      llmOverloaded: true,
      llmProvider: 'heuristic',
    };
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
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          console.warn(`[IntentParser] Gemini API (${model}) returned status ${res.status}: ${errBody}`);
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
          llmProvider: 'gemini',
        };
      } catch (err) {
        console.warn(`[IntentParser] Error with model ${model}:`, err);
        continue;
      }
    }

    return null;
  }

  private async callOmniRouteFallback(prompt: string): Promise<ParsedIntent | null> {
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

    const candidateUrls = Array.from(
      new Set(
        [
          this.omnirouteUrl,
          process.env.OMNIROUTE_URL,
          'http://host.docker.internal:20128',
          'http://localhost:20128',
        ].filter(Boolean) as string[]
      )
    );

    const candidateModels = Array.from(
      new Set(
        [
          process.env.OMNIROUTE_MODEL,
          'deepseek-v4-flash',
          'gemini-flash-lite-latest',
          'combo/auto-fallback',
        ].filter(Boolean) as string[]
      )
    );

    for (const baseUrl of candidateUrls) {
      const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

      for (const model of candidateModels) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              temperature: 0.1,
            }),
            signal: AbortSignal.timeout(4000),
          });

          if (!res.ok) {
            continue;
          }

          const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };

          let raw = data.choices?.[0]?.message?.content?.trim();
          if (!raw) continue;

          if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          }

          const parsed = JSON.parse(raw);
          return {
            action: parsed.action || 'search',
            title: parsed.title || undefined,
            mediaType: parsed.mediaType || undefined,
            seasonNumber: typeof parsed.seasonNumber === 'number' ? parsed.seasonNumber : undefined,
            episodeNumber: typeof parsed.episodeNumber === 'number' ? parsed.episodeNumber : undefined,
            isSeasonPack: Boolean(parsed.isSeasonPack),
            raw: prompt,
            llmProvider: 'omniroute',
          };
        } catch {
          continue;
        }
      }
    }

    return null;
  }
}
