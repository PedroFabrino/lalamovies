import {
  MdmUser,
  MetadataCandidate,
  SeriesProgressResult,
  SearchReleasesResponse,
  ReleaseCandidate,
} from './types';

export interface ApiClientOptions {
  baseUrl: string;
  serviceApiKey: string;
}

export class MdmApiClient {
  private baseUrl: string;
  private serviceApiKey: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.serviceApiKey = options.serviceApiKey;
  }

  private getHeaders(userId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-service-key': this.serviceApiKey,
    };
    if (userId) {
      headers['x-user-id'] = userId;
    }
    return headers;
  }

  async getUserByChatId(chatId: string | number): Promise<MdmUser | null> {
    try {
      const res = await fetch(`${this.baseUrl}/internal/telegram/user/${chatId}`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { user: MdmUser };
      return data.user || null;
    } catch {
      return null;
    }
  }

  async pairUser(code: string, chatId: string | number): Promise<{ ok: boolean; user?: MdmUser; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/internal/telegram/pair`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ code: code.trim(), chatId: String(chatId) }),
      });
      const data = (await res.json()) as { ok?: boolean; user?: MdmUser; message?: string };
      if (!res.ok || !data.ok) {
        return { ok: false, message: data.message || 'Código de pareamento inválido ou expirado' };
      }
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, message: 'Falha de comunicação com o servidor MDM' };
    }
  }

  async getTelegramConfig(): Promise<{ globalGeminiApiKey: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/internal/telegram/config`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return { globalGeminiApiKey: true };
      const data = (await res.json()) as { globalGeminiApiKey: boolean };
      return { globalGeminiApiKey: Boolean(data.globalGeminiApiKey) };
    } catch {
      return { globalGeminiApiKey: true };
    }
  }

  async setUserGeminiApiKey(chatId: string | number, apiKey: string | null): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/internal/telegram/user/${chatId}/gemini-api-key`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ apiKey }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async searchMetadata(userId: string, query: string, mediaType?: string): Promise<MetadataCandidate[]> {
    try {
      const res = await fetch(`${this.baseUrl}/requests/search-metadata`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify({ query, mediaType: mediaType || 'movie' }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { candidates?: MetadataCandidate[] };
      return data.candidates || [];
    } catch {
      return [];
    }
  }

  async getSeriesProgress(userId: string, metadataId: string | number, title: string): Promise<SeriesProgressResult> {
    try {
      const url = new URL(`${this.baseUrl}/requests/series-progress`);
      url.searchParams.set('metadataId', String(metadataId));
      url.searchParams.set('title', title);
      url.searchParams.set('mediaType', 'tv_show');

      const res = await fetch(url.toString(), {
        headers: this.getHeaders(userId),
      });
      if (!res.ok) return { hasProgress: false };
      const data = (await res.json()) as {
        hasProgress?: boolean;
        suggestedSeason?: number;
        suggestedEpisode?: number;
        totalDownloadedEpisodes?: number;
      };
      return {
        hasProgress: Boolean(data.hasProgress),
        suggestedSeason: data.suggestedSeason,
        suggestedEpisode: data.suggestedEpisode,
        totalDownloadedEpisodes: data.totalDownloadedEpisodes,
      };
    } catch {
      return { hasProgress: false };
    }
  }

  async searchReleases(
    userId: string,
    params: {
      title: string;
      mediaType: string;
      year?: number | null;
      seasonNumber?: number | null;
      episodeNumber?: number | null;
      isSeasonPack?: boolean;
    }
  ): Promise<SearchReleasesResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/requests/search-releases`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify(params),
      });
      if (!res.ok) return { releases: [] };
      const data = (await res.json()) as {
        recommendedRelease?: ReleaseCandidate | null;
        releases?: ReleaseCandidate[];
        isFutureOrUnreleased?: boolean;
      };
      return {
        recommendedRelease: data.recommendedRelease || (data.releases && data.releases[0]) || null,
        releases: data.releases || [],
        isFutureOrUnreleased: Boolean(data.isFutureOrUnreleased),
      };
    } catch {
      return { releases: [] };
    }
  }

  async createRequest(
    userId: string,
    payload: {
      title: string;
      mediaType: string;
      downloadUrl: string;
      infoHash?: string;
      tmdbId?: number | null;
      imdbId?: string | null;
      year?: number | null;
      seasonNumber?: number | null;
      episodeNumber?: number | null;
      isSeasonPack?: boolean;
      qualityScore?: number;
      source?: string;
      resolution?: string;
    }
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/requests`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { id?: string; message?: string; error?: string };
      if (!res.ok) {
        return { ok: false, error: data.message || data.error || 'Falha ao enfileirar download' };
      }
      return { ok: true, id: data.id };
    } catch (err) {
      return { ok: false, error: 'Erro de comunicação ao criar download' };
    }
  }

  async createWaitlist(
    userId: string,
    payload: {
      title: string;
      mediaType: string;
      tmdbId?: number | null;
      imdbId?: string | null;
      year?: number | null;
      seasonNumber?: number | null;
      episodeNumber?: number | null;
      waitlistNextSeason?: boolean;
    }
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/waitlist`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        return { ok: false, message: data.message || data.error || 'Falha ao adicionar na waitlist' };
      }
      return { ok: true, message: data.message };
    } catch (err) {
      return { ok: false, message: 'Erro de comunicação com waitlist' };
    }
  }
}
