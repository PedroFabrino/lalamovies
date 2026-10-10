import {
  MdmUser,
  MetadataCandidate,
  SeriesProgressResult,
  SearchReleasesResponse,
  ReleaseCandidate,
  MediaType,
  UserReportResponse,
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

  private async fetchMetadataCandidates(
    userId: string,
    query: string,
    mediaType: MediaType
  ): Promise<MetadataCandidate[]> {
    try {
      const res = await fetch(`${this.baseUrl}/requests/search-metadata`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify({ query, mediaType }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { candidates?: Array<Partial<MetadataCandidate>> };
      return (data.candidates || []).map((c) => ({
        id: !isNaN(Number(c.id)) ? Number(c.id) : (c.id as unknown as number),
        title: c.title || query,
        mediaType,
        year: c.year ?? null,
        posterUrl: c.posterUrl ?? null,
        overview: c.overview ?? null,
        romajiTitle: c.romajiTitle ?? null,
        englishTitle: c.englishTitle ?? null,
      }));
    } catch {
      return [];
    }
  }

  async searchMetadata(userId: string, query: string, mediaType?: MediaType): Promise<MetadataCandidate[]> {
    if (mediaType) {
      return this.fetchMetadataCandidates(userId, query, mediaType);
    }

    // When mediaType is not specified, search across movie, tv_show, and anime in parallel
    const [movies, tvShows, anime] = await Promise.all([
      this.fetchMetadataCandidates(userId, query, 'movie'),
      this.fetchMetadataCandidates(userId, query, 'tv_show'),
      this.fetchMetadataCandidates(userId, query, 'anime'),
    ]);

    const seenUnique = new Set<string>();
    const seenTmdbShowIds = new Set<number>();
    const combined: MetadataCandidate[] = [];

    // Prioritize anime > tvShows > movies
    for (const c of [...anime, ...tvShows, ...movies]) {
      if (c.mediaType === 'tv_show' || c.mediaType === 'anime') {
        if (seenTmdbShowIds.has(c.id)) continue;
        seenTmdbShowIds.add(c.id);
      }
      const uniqueKey = `${c.mediaType}:${c.id}`;
      if (!seenUnique.has(uniqueKey)) {
        seenUnique.add(uniqueKey);
        combined.push(c);
      }
    }

    return combined;
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
      romajiTitle?: string | null;
      englishTitle?: string | null;
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
        recommended?: ReleaseCandidate | null;
        recommendedRelease?: ReleaseCandidate | null;
        candidates?: ReleaseCandidate[];
        releases?: ReleaseCandidate[];
        totalFound?: number;
      };
      const candidateList: ReleaseCandidate[] = (data.candidates || data.releases || []).map((c) => ({
        ...c,
        downloadUrl: c.downloadUrl || (c as any).magnetUrl || (c as any).guid,
      }));
      const rawRecommended = data.recommended || data.recommendedRelease || (candidateList.length > 0 ? candidateList[0] : null);
      const recommended = rawRecommended ? {
        ...rawRecommended,
        downloadUrl: rawRecommended.downloadUrl || (rawRecommended as any).magnetUrl || (rawRecommended as any).guid,
      } : null;
      return {
        recommendedRelease: recommended,
        releases: candidateList,
        isFutureOrUnreleased: candidateList.length === 0,
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
      metadataId?: string | number | null;
      metadataSource?: 'tmdb';
      tmdbId?: number | string | null;
      imdbId?: string | null;
      year?: number | null;
      seasonNumber?: number | null;
      episodeNumber?: number | null;
      isSeasonPack?: boolean;
      waitlistNextSeason?: boolean;
      qualityScore?: number;
      source?: string;
      resolution?: string;
    }
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    try {
      const metaId = String(payload.metadataId || payload.tmdbId || '');
      const metaSource = payload.metadataSource || 'tmdb';

      const body: Record<string, unknown> = {
        title: payload.title,
        mediaType: payload.mediaType,
        metadataId: metaId,
        metadataSource: metaSource,
        magnetLink: payload.downloadUrl,
        year: payload.year ?? undefined,
        seasonNumber: payload.seasonNumber ?? undefined,
        episodeNumber: payload.episodeNumber ?? undefined,
        waitlistNextSeason: payload.waitlistNextSeason,
      };

      const res = await fetch(`${this.baseUrl}/requests`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { request?: { id: string }; id?: string; message?: string; error?: string };
      if (!res.ok) {
        return { ok: false, error: data.message || data.error || 'Falha ao enfileirar download' };
      }
      return { ok: true, id: data.request?.id || data.id };
    } catch (err) {
      return { ok: false, error: 'Erro de comunicação ao criar download' };
    }
  }

  async createWaitlist(
    userId: string,
    payload: {
      title: string;
      mediaType: string;
      metadataId?: string | number | null;
      metadataSource?: 'tmdb' | 'anilist';
      tmdbId?: number | string | null;
      imdbId?: string | null;
      year?: number | null;
      seasonNumber?: number | null;
      episodeNumber?: number | null;
      targetEpisode?: number | null;
      waitlistNextSeason?: boolean;
      posterUrl?: string | null;
    }
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const metaId = String(payload.metadataId || payload.tmdbId || '');
      const metaSource = payload.metadataSource || 'tmdb';
      const targetEp = payload.targetEpisode !== undefined ? payload.targetEpisode : payload.episodeNumber;

      const body: Record<string, unknown> = {
        userId,
        title: payload.title,
        mediaType: payload.mediaType,
        metadataId: metaId,
        metadataSource: metaSource,
        year: payload.year ?? undefined,
        seasonNumber: payload.seasonNumber ?? undefined,
        targetEpisode: targetEp ?? undefined,
        isNextSeason: Boolean(payload.waitlistNextSeason),
        posterUrl: payload.posterUrl ?? undefined,
      };

      const res = await fetch(`${this.baseUrl}/waitlist`, {
        method: 'POST',
        headers: this.getHeaders(userId),
        body: JSON.stringify(body),
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

  async getUserReport(chatId: string | number): Promise<UserReportResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/internal/telegram/user/${chatId}/report`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return null;
      return (await res.json()) as UserReportResponse;
    } catch {
      return null;
    }
  }

  async setUserReportMessageId(chatId: string | number, messageId: number | null): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/internal/telegram/user/${chatId}/report-message-id`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ messageId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async setRequestSnatchMessageId(requestId: string, messageId: number | null): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/internal/telegram/request/${requestId}/snatch-message-id`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ messageId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
