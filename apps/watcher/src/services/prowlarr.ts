import { isPreferredIndexer } from '../utils/preferredIndexer';
import { buildSeriesSearchQueries } from '../utils/seriesQueryBuilder';
import {
  CAM_REGEX,
  formatBytes,
  parseReleaseTitle,
  scoreRelease,
  type ReleaseCandidate,
  type ReleaseSource,
  type Resolution,
  type ScoreOptions,
  type VideoCodec,
  isTitleRelevant,
} from './prowlarrScoring';

export {
  CAM_REGEX,
  formatBytes,
  parseReleaseTitle,
  scoreRelease,
  isTitleRelevant,
  type ReleaseCandidate,
  type ReleaseSource,
  type Resolution,
  type ScoreOptions,
  type VideoCodec,
};

export interface WatcherProwlarrOptions {
  prowlarrUrl?: string;
  apiKey?: string;
}

export class WatcherProwlarrService {
  private prowlarrUrl: string;
  private apiKey: string;

  constructor(options: WatcherProwlarrOptions = {}) {
    this.prowlarrUrl = (options.prowlarrUrl || process.env.PROWLARR_URL || 'http://localhost:9696').replace(/\/+$/, '');
    this.apiKey = options.apiKey || process.env.PROWLARR_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  private async executeSingleSearch(
    query: string,
    categories: number[],
    scoreOptions: ScoreOptions
  ): Promise<ReleaseCandidate[]> {
    const catParams = categories.map((c) => `categories=${encodeURIComponent(c)}`).join('&');
    const endpointUrl = `${this.prowlarrUrl}/api/v1/search?query=${encodeURIComponent(query)}&type=search&${catParams}`;

    let response: Response;
    try {
      response = await fetch(endpointUrl, {
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'application/json',
        },
      });
    } catch {
      return [];
    }

    if (!response.ok) {
      return [];
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
    }>;

    const candidates: ReleaseCandidate[] = [];

    for (const item of rawData) {
      const releaseTitle = item.title?.trim() || '';
      const downloadUrl = item.magnetUrl || item.downloadUrl || '';

      if (!releaseTitle || !downloadUrl) {
        continue;
      }

      const sizeBytes = item.size || 0;
      const seeders = typeof item.seeders === 'number' ? Math.max(0, item.seeders) : 0;
      const leechers = typeof item.leechers === 'number' ? Math.max(0, item.leechers) : 0;
      const indexer = item.indexer || 'Tracker';
      const guid = item.guid || downloadUrl;

      const isPreferred = isPreferredIndexer(indexer);
      const { resolution, codec, source } = parseReleaseTitle(releaseTitle);
      const { score, isLowHealth } = scoreRelease(
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
          isPreferred,
        },
        scoreOptions
      );

      let infoHash = (item as { infoHash?: string }).infoHash;
      if (!infoHash && downloadUrl) {
        const hashMatch = downloadUrl.match(/urn:btih:([a-zA-Z0-9]+)/i);
        if (hashMatch) {
          infoHash = hashMatch[1];
        }
      }
      const normalizedInfoHash = infoHash ? infoHash.toLowerCase() : undefined;

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
        isPreferred,
        infoHash: normalizedInfoHash,
      });
    }

    return candidates;
  }

  async searchForEntry(entry: {
    mediaType: 'movie' | 'tv_show' | 'anime';
    title: string;
    year?: number | null;
    seasonNumber?: number | null;
    targetEpisode?: number | null;
    englishTitle?: string | null;
    romajiTitle?: string | null;
    aliases?: string[];
  }): Promise<ReleaseCandidate[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const { mediaType, title, year, seasonNumber, targetEpisode, englishTitle, romajiTitle, aliases } = entry;
    const isSingleEpisode = targetEpisode !== undefined && targetEpisode !== null;
    const effectiveSeason = seasonNumber ?? (mediaType !== 'movie' ? 1 : null);
    const mergedAliases = [
      romajiTitle,
      englishTitle,
      ...(aliases || []),
    ].filter((t): t is string => Boolean(t && t.trim().length > 0));

    const scoreOptions: ScoreOptions = {
      mediaType,
      isSingleEpisode,
      seasonNumber: effectiveSeason,
      episodeNumber: targetEpisode ?? null,
      title,
      aliases: mergedAliases,
    };

    let allCandidates: ReleaseCandidate[] = [];

    if (mediaType === 'movie') {
      const parts = [title.trim()];
      if (year) parts.push(String(year));
      allCandidates = await this.executeSingleSearch(parts.join(' '), [2000], scoreOptions);
    } else {
      const seriesQueries = buildSeriesSearchQueries({
        title,
        seasonNumber,
        episodeNumber: targetEpisode,
        englishTitle,
        romajiTitle,
      });

      const results = await Promise.allSettled(
        seriesQueries.map((sq) => this.executeSingleSearch(sq.query, sq.categories, scoreOptions))
      );

      const candidateList: ReleaseCandidate[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') {
          candidateList.push(...r.value);
        }
      }
      allCandidates = candidateList;
    }

    // Deduplicate candidates by infoHash (normalized) with fallback to guid/downloadUrl
    const candidateMap = new Map<string, ReleaseCandidate>();
    for (const cand of allCandidates) {
      const key = cand.infoHash ? `hash:${cand.infoHash.toLowerCase()}` : (cand.guid || cand.downloadUrl);
      const existing = candidateMap.get(key);
      if (!existing) {
        candidateMap.set(key, cand);
      } else if (cand.score > existing.score || (cand.score === existing.score && cand.seeders > existing.seeders)) {
        candidateMap.set(key, cand);
      }
    }
    allCandidates = Array.from(candidateMap.values());

    allCandidates.sort((a, b) => b.score - a.score);

    return allCandidates;
  }
}
