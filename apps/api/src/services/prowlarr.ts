import { isPreferredIndexer, isQualifiedPreferred } from '../utils/preferredIndexer';
import { buildSeriesSearchQueries, hasCjkCharacters } from '../utils/seriesQueryBuilder';
import {
  Resolution, VideoCodec, ReleaseSource, ScoreOptions, formatBytes, parseReleaseTitle, scoreRelease, ScorableCandidate,
} from './prowlarr/prowlarrScoring';
import { hasPasskey, isKnownPrivateIndexer, IndexerPrivacyCache } from './prowlarr/prowlarrPrivacy';
import { ReleaseCandidate, SearchReleasesResult, SearchReleasesOptions, IProwlarrService } from './prowlarr/prowlarrTypes';

export type {
  Resolution, VideoCodec, ReleaseSource, ScoreOptions, ScorableCandidate,
  ReleaseCandidate, SearchReleasesResult, SearchReleasesOptions, IProwlarrService,
};
export { hasPasskey, isKnownPrivateIndexer, formatBytes, parseReleaseTitle, scoreRelease, hasCjkCharacters };

export class ProwlarrService implements IProwlarrService {
  private prowlarrUrl: string;
  private apiKey: string;
  private indexerPrivacyCache = new IndexerPrivacyCache();
  private infringingHashes: Set<string> = new Set([
    '2a4a6d6710f271957b1ea2f8a9a748e84e6d10a3',
    '6b7469c830b624321f843a95d0bd162aaf2abff4',
    'f80c229155dc53d373b9464119503cf0dae092a9',
    '23fcdd2d194d479de2c38e1dd1befe6d8b28af9b',
  ]);

  constructor(prowlarrUrl?: string, apiKey?: string) {
    this.prowlarrUrl = (prowlarrUrl || process.env.PROWLARR_URL || 'http://localhost:9696').replace(/\/+$/, '');
    this.apiKey = apiKey || process.env.PROWLARR_API_KEY || '';
  }

  markHashInfringing(hash: string): void {
    if (hash) {
      this.infringingHashes.add(hash.toLowerCase().trim());
    }
  }

  isHashInfringing(hash: string): boolean {
    if (!hash) return false;
    return this.infringingHashes.has(hash.toLowerCase().trim());
  }

  async getIndexerPrivacy(indexerIdOrName: number | string): Promise<boolean> {
    await this.refreshIndexerPrivacyCacheIfNeeded();
    return this.isIndexerPrivate(indexerIdOrName);
  }

  isIndexerPrivate(indexerIdOrName: number | string): boolean {
    if (typeof indexerIdOrName === 'number') {
      if (this.indexerPrivacyCache.has(indexerIdOrName)) {
        return this.indexerPrivacyCache.get(indexerIdOrName)!;
      }
    } else {
      const lower = String(indexerIdOrName).toLowerCase().trim();
      if (this.indexerPrivacyCache.has(lower)) {
        return this.indexerPrivacyCache.get(lower)!;
      }
    }
    return isKnownPrivateIndexer(String(indexerIdOrName));
  }

  async refreshIndexerPrivacyCacheIfNeeded(): Promise<void> {
    if (!this.indexerPrivacyCache.isExpired()) {
      return;
    }
    if (!this.apiKey) {
      return;
    }

    try {
      const response = await fetch(`${this.prowlarrUrl}/api/v1/indexer`, {
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const indexers = (await response.json()) as Array<{
          id?: number;
          name?: string;
          privacy?: string;
        }>;

        this.indexerPrivacyCache.clear();
        for (const idx of indexers) {
          const isPrivate = idx.privacy !== 'public';
          if (idx.id !== undefined) {
            this.indexerPrivacyCache.set(idx.id, isPrivate);
          }
          if (idx.name) {
            this.indexerPrivacyCache.set(idx.name.toLowerCase().trim(), isPrivate);
          }
        }
        this.indexerPrivacyCache.setFreshExpires();
      }
    } catch {
      // Non-blocking fallback
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetch(`${this.prowlarrUrl}/api/v1/health`, {
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'application/json',
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  parseReleaseTitle(title: string): { resolution: Resolution; codec: VideoCodec; source: ReleaseSource } {
    return parseReleaseTitle(title);
  }

  scoreRelease(
    candidate: Omit<ReleaseCandidate, 'score' | 'isLowHealth'>,
    options?: ScoreOptions
  ): { score: number; isLowHealth: boolean } {
    return scoreRelease(candidate, options);
  }

  private async executeSearch(
    query: string,
    categories: number[],
    scoreOptions: ScoreOptions
  ): Promise<{ candidates: ReleaseCandidate[]; isReachable: boolean; error?: string }> {
    const catParams = categories.map((c) => `categories=${encodeURIComponent(c)}`).join('&');
    const endpointUrl = `${this.prowlarrUrl}/api/v1/search?query=${encodeURIComponent(
      query
    )}&type=search&${catParams}`;

    let response: Response;
    try {
      response = await fetch(endpointUrl, {
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'application/json',
        },
      });
    } catch {
      return { candidates: [], isReachable: false, error: `Unable to connect to Prowlarr at ${this.prowlarrUrl}` };
    }

    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      return {
        candidates: [],
        isReachable: !isAuthError,
        error: isAuthError
          ? 'Prowlarr authentication failed (invalid API key)'
          : `Prowlarr returned HTTP ${response.status}`,
      };
    }

    const rawData = (await response.json()) as Array<{
      guid?: string;
      title?: string;
      size?: number;
      indexer?: string;
      seeders?: number;
      leechers?: number;
      downloadUrl?: string;
      magnetUrl?: string;
      infoHash?: string;
    }>;

    const candidates: ReleaseCandidate[] = [];
    await this.refreshIndexerPrivacyCacheIfNeeded();

    for (const item of rawData) {
      const releaseTitle = item.title?.trim() || '';
      const downloadUrl = item.magnetUrl || item.downloadUrl || '';

      if (!releaseTitle || !downloadUrl) {
        continue;
      }

      let infoHash = item.infoHash?.trim().toLowerCase() || '';
      if (!infoHash) {
        const hashMatch = downloadUrl.match(/urn:btih:([a-zA-Z0-9]+)/i);
        if (hashMatch) {
          infoHash = hashMatch[1].toLowerCase();
        }
      }

      const sizeBytes = item.size || 0;
      const seeders = typeof item.seeders === 'number' ? Math.max(0, item.seeders) : 0;
      const leechers = typeof item.leechers === 'number' ? Math.max(0, item.leechers) : 0;
      const indexer = item.indexer || 'Tracker';
      const indexerId = (item as { indexerId?: number }).indexerId;
      const guid = item.guid || downloadUrl;

      const isPrivateTracker = this.indexerPrivacyCache.isPrivate(indexerId, indexer, downloadUrl);
      const isPreferred = isPreferredIndexer(indexer);
      const { resolution, codec, source } = this.parseReleaseTitle(releaseTitle);
      const { score, isLowHealth } = this.scoreRelease(
        {
          guid,
          title: releaseTitle,
          sizeBytes,
          formattedSize: formatBytes(sizeBytes),
          seeders,
          leechers,
          downloadUrl,
          indexer,
          resolution,
          codec,
          source,
          isPrivateTracker,
          isPreferred,
        },
        scoreOptions
      );

      candidates.push({
        guid,
        title: releaseTitle,
        sizeBytes,
        formattedSize: formatBytes(sizeBytes),
        seeders,
        leechers,
        downloadUrl,
        indexer,
        resolution,
        codec,
        source,
        score,
        isLowHealth,
        isPrivateTracker,
        isPreferred,
        infoHash: infoHash || undefined,
        magnetUrl: item.magnetUrl || undefined,
        isInfringing: Boolean(infoHash && this.isHashInfringing(infoHash)),
      });
    }

    return { candidates, isReachable: true };
  }

  async searchMovieReleases(title: string, year?: number | null): Promise<SearchReleasesResult> {
    return this.searchReleases({ mediaType: 'movie', title, year });
  }

  async searchReleases(options: SearchReleasesOptions): Promise<SearchReleasesResult> {
    if (!this.isConfigured()) {
      return {
        recommended: null,
        candidates: [],
        totalFound: 0,
        isConfigured: false,
        isReachable: false,
        hasHealthyReleases: false,
      };
    }

    const { mediaType, title, year, seasonNumber, episodeNumber, romajiTitle, englishTitle, seasonName } = options;
    const isSingleEpisode = episodeNumber !== undefined && episodeNumber !== null;
    const effectiveSeason = seasonNumber ?? (mediaType !== 'movie' ? 1 : null);
    const scoreOptions: ScoreOptions = {
      mediaType,
      isSingleEpisode,
      seasonNumber: effectiveSeason,
      episodeNumber: episodeNumber ?? null,
      title,
      aliases: [romajiTitle, englishTitle, seasonName].filter((t): t is string => Boolean(t && t.trim())),
    };

    let candidates: ReleaseCandidate[] = [];
    let isReachable = true;
    let searchError: string | undefined;

    const mergeCandidates = (newCandidates: ReleaseCandidate[]) => {
      const existingKeys = new Set(
        candidates.map((c) => (c.infoHash ? `hash:${c.infoHash.toLowerCase()}` : c.guid || c.downloadUrl))
      );
      for (const item of newCandidates) {
        const key = item.infoHash ? `hash:${item.infoHash.toLowerCase()}` : item.guid || item.downloadUrl;
        if (!existingKeys.has(key)) {
          candidates.push(item);
          existingKeys.add(key);
        }
      }
    };

    if (mediaType === 'movie' || (mediaType === 'private' && !seasonNumber && !episodeNumber)) {
      let primaryTitle = title.trim();
      let altTitle = englishTitle && englishTitle.trim();
      if (hasCjkCharacters(primaryTitle) && altTitle && !hasCjkCharacters(altTitle)) {
        const temp = primaryTitle;
        primaryTitle = altTitle;
        altTitle = temp;
      }

      const queryParts = [primaryTitle];
      if (year) {
        queryParts.push(String(year));
      }
      const query = queryParts.join(' ');
      const searchRes = await this.executeSearch(query, [2000], scoreOptions);
      candidates = searchRes.candidates;
      isReachable = searchRes.isReachable;
      searchError = searchRes.error;

      if (candidates.length < 3 && year) {
        const fallbackRes = await this.executeSearch(primaryTitle, [2000], scoreOptions);
        mergeCandidates(fallbackRes.candidates);
      }

      if (candidates.length < 3 && altTitle && altTitle.toLowerCase() !== primaryTitle.toLowerCase()) {
        const altParts = [altTitle];
        if (year) altParts.push(String(year));
        const fallbackRes = await this.executeSearch(altParts.join(' '), [2000], scoreOptions);
        mergeCandidates(fallbackRes.candidates);
      }
    } else {
      const seriesQueries = buildSeriesSearchQueries({
        title,
        seasonNumber,
        episodeNumber,
        englishTitle,
        romajiTitle,
        seasonName,
      });

      const searchPromises = seriesQueries.map((sq) =>
        this.executeSearch(sq.query, sq.categories, scoreOptions)
      );

      const settled = await Promise.allSettled(searchPromises);
      let anyReachable = false;
      for (const res of settled) {
        if (res.status === 'fulfilled') {
          if (res.value.isReachable) anyReachable = true;
          if (res.value.error && !searchError) searchError = res.value.error;
          mergeCandidates(res.value.candidates);
        }
      }
      isReachable = anyReachable;
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Recommended release selection:
    // 1. Qualified preferred release (seeders >= 3, non-CAM) with positive score
    // 2. Fallback: healthy public release (seeders >= 5) with positive score
    const recommended =
      candidates.find((c) => isQualifiedPreferred(c) && c.score > 0) ||
      candidates.find((c) => !c.isLowHealth && c.score > 0) ||
      null;
    const hasHealthyReleases = candidates.some((c) => (!c.isLowHealth || isQualifiedPreferred(c)) && c.score > 0);

    return {
      recommended,
      candidates,
      totalFound: candidates.length,
      isConfigured: true,
      isReachable,
      hasHealthyReleases,
      error: searchError,
    };
  }

  async searchLatestByCategory(
    categories: number[],
    scoreOptions?: ScoreOptions
  ): Promise<{ candidates: ReleaseCandidate[]; isReachable: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { candidates: [], isReachable: false, error: 'Prowlarr is not configured with an API key' };
    }
    return this.executeSearch('', categories, scoreOptions || {});
  }
}
