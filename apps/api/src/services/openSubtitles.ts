import fs from 'node:fs';
import path from 'node:path';
import {
  FallbackSubtitleMeta,
  downloadFromLegacyOpenSubtitles,
  searchLegacyOpenSubtitles,
} from './openSubtitlesFallback';

export interface OpenSubtitlesOptions {
  apiKey?: string;
  baseUrl?: string;
  userAgent?: string;
  fetchFn?: typeof fetch;
  logger?: {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string, err?: unknown) => void;
  };
}

export interface SearchSubtitlesParams {
  tmdbId?: string | number | null;
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

export interface SubtitleSearchResult {
  fileId: number;
  uploaderName: string;
  downloadCount: number;
  uploadDate: string;
  fileSizeBytes?: number;
  releaseName: string;
}

export class OpenSubtitlesService {
  private apiKey: string;
  private baseUrl: string;
  private userAgent: string;
  private fetchFn: typeof fetch;
  private logger?: OpenSubtitlesOptions['logger'];
  private fallbackCache = new Map<number, FallbackSubtitleMeta>();
  private lastFallbackContext?: Partial<FallbackSubtitleMeta>;

  constructor(options: OpenSubtitlesOptions = {}) {
    this.apiKey = options.apiKey?.trim() || '';
    this.baseUrl = options.baseUrl?.replace(/\/$/, '') || 'https://api.opensubtitles.com/api/v1';
    this.userAgent = options.userAgent || 'MDM Media Server v1.0';
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.logger = options.logger;
  }

  setFallbackContext(context: Partial<FallbackSubtitleMeta>): void {
    this.lastFallbackContext = context;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private getHeaders(): Record<string, string> {
    return {
      'Api-Key': this.apiKey,
      'User-Agent': this.userAgent,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async executeSearch(url: URL, params: SearchSubtitlesParams): Promise<SubtitleSearchResult[]> {
    const res = await this.fetchFn(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      this.logger?.warn?.(`OpenSubtitles search failed with status ${res.status}: ${res.statusText}`);
      return [];
    }

    interface OpenSubtitlesSearchResponse {
      data?: Array<{
        attributes?: {
          files?: Array<{ file_id?: number; file_size?: number; file_name?: string }>;
          language?: string;
          download_count?: number;
          new_download_count?: number;
          release?: string;
          legacy_subtitle_id?: number | null;
          uploader?: { name?: string };
          upload_date?: string;
          file_size?: number;
          file_name?: string;
          feature_details?: {
            imdb_id?: number | null;
            parent_imdb_id?: number | null;
            season_number?: number | null;
            episode_number?: number | null;
          };
        };
      }>;
    }

    const json = (await res.json()) as OpenSubtitlesSearchResponse;
    if (!json || !Array.isArray(json.data)) {
      return [];
    }

    const parsedResults: SubtitleSearchResult[] = [];
    for (const item of json.data) {
      const attrs = item.attributes || {};
      const firstFile = Array.isArray(attrs.files) && attrs.files.length > 0 ? attrs.files[0] : null;
      if (!firstFile || !firstFile.file_id) {
        continue;
      }

      const releaseName = attrs.release || firstFile.file_name || attrs.file_name || params.title;
      const downloadCount = (Number(attrs.download_count) || 0) + (Number(attrs.new_download_count) || 0);

      this.fallbackCache.set(firstFile.file_id, {
        imdbId: attrs.feature_details?.imdb_id ?? null,
        parentImdbId: attrs.feature_details?.parent_imdb_id ?? null,
        legacySubtitleId: attrs.legacy_subtitle_id ?? null,
        seasonNumber: attrs.feature_details?.season_number ?? params.seasonNumber ?? null,
        episodeNumber: attrs.feature_details?.episode_number ?? params.episodeNumber ?? null,
        title: params.title,
        releaseName,
      });

      parsedResults.push({
        fileId: firstFile.file_id,
        uploaderName: attrs.uploader?.name || 'Anonymous',
        downloadCount,
        uploadDate: attrs.upload_date || '',
        fileSizeBytes: firstFile.file_size || attrs.file_size || undefined,
        releaseName,
      });
    }

    parsedResults.sort((a, b) => b.downloadCount - a.downloadCount);
    return parsedResults.slice(0, 5);
  }

  async searchSubtitles(params: SearchSubtitlesParams): Promise<SubtitleSearchResult[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const isEpisodic = params.seasonNumber != null || params.episodeNumber != null;

      const buildUrl = (options: { useTmdbIdOnly?: boolean; useParentTmdbId?: boolean }) => {
        const url = new URL(`${this.baseUrl}/subtitles`);
        url.searchParams.set('languages', 'pt-br,pt');
        url.searchParams.set('order_by', 'download_count');
        url.searchParams.set('order_direction', 'desc');

        if (isEpisodic) {
          if (options.useParentTmdbId && params.tmdbId) {
            url.searchParams.set('parent_tmdb_id', String(params.tmdbId));
          } else if (params.title) {
            url.searchParams.set('query', params.title);
          }
          if (params.seasonNumber != null) {
            url.searchParams.set('season_number', String(params.seasonNumber));
          }
          if (params.episodeNumber != null) {
            url.searchParams.set('episode_number', String(params.episodeNumber));
          }
        } else if (options.useTmdbIdOnly && params.tmdbId) {
          // For movies with tmdbId, querying tmdb_id without query/year avoids OpenSubtitles
          // full-text mismatch (e.g. 12 Angry Men returning 0 when query + tmdb_id are combined)
          url.searchParams.set('tmdb_id', String(params.tmdbId));
        } else if (params.title) {
          url.searchParams.set('query', params.title);
        }

        return url;
      };

      let results: SubtitleSearchResult[] = [];
      if (isEpisodic) {
        results = await this.executeSearch(buildUrl({}), params);
        if (results.length === 0 && params.tmdbId) {
          results = await this.executeSearch(buildUrl({ useParentTmdbId: true }), params);
        }
      } else {
        if (params.tmdbId) {
          results = await this.executeSearch(buildUrl({ useTmdbIdOnly: true }), params);
        }
        if (results.length === 0 && params.title) {
          results = await this.executeSearch(buildUrl({ useTmdbIdOnly: false }), params);
        }
      }

      return results;
    } catch (err) {
      this.logger?.warn?.(`OpenSubtitles search failed: ${(err as Error).message}`);
      return [];
    }
  }

  async downloadAndWrite(
    fileId: number | string,
    destPath: string,
    fallbackContext?: Partial<FallbackSubtitleMeta>
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    const numericId = Number(fileId);
    const cachedMeta = this.fallbackCache.get(numericId);
    const effectiveContext = fallbackContext || this.lastFallbackContext;
    const mergedMeta: FallbackSubtitleMeta | undefined =
      cachedMeta || effectiveContext
        ? { ...effectiveContext, ...cachedMeta }
        : undefined;

    try {
      if (fs.existsSync(destPath) && fs.statSync(destPath).isDirectory()) {
        this.logger?.warn?.(`Cannot write subtitle to directory path: ${destPath}`);
        return false;
      }

      if (mergedMeta?.directDownloadUrl) {
        return await downloadFromLegacyOpenSubtitles(
          numericId,
          destPath,
          mergedMeta,
          this.fetchFn,
          this.logger
        );
      }

      const res = await this.fetchFn(`${this.baseUrl}/download`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ file_id: numericId }),
      });

      if (!res.ok) {
        this.logger?.error?.(`OpenSubtitles download ticket failed: HTTP ${res.status}`);
        if (mergedMeta) {
          return await downloadFromLegacyOpenSubtitles(
            numericId,
            destPath,
            mergedMeta,
            this.fetchFn,
            this.logger
          );
        }
        return false;
      }

      const ticket = (await res.json()) as { link?: string };
      if (!ticket?.link) {
        this.logger?.error?.('OpenSubtitles download response missing download link');
        return false;
      }

      const fileRes = await this.fetchFn(ticket.link);
      if (!fileRes.ok) {
        this.logger?.error?.(`Failed to download subtitle file from link: HTTP ${fileRes.status}`);
        return false;
      }

      const content = await fileRes.text();
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.writeFileSync(destPath, content, 'utf8');
      this.logger?.info?.(`Successfully wrote subtitle to ${destPath}`);
      return true;
    } catch (err) {
      this.logger?.error?.(`OpenSubtitles download failed for fileId ${fileId}`, err);
      if (mergedMeta) {
        return await downloadFromLegacyOpenSubtitles(
          numericId,
          destPath,
          mergedMeta,
          this.fetchFn,
          this.logger
        );
      }
      return false;
    }
  }

  async fetchBest(params: SearchSubtitlesParams, destPath: string): Promise<boolean> {
    try {
      if (fs.existsSync(destPath) && fs.statSync(destPath).isDirectory()) {
        return false;
      }
    } catch {
      // ignore
    }

    let results = await this.searchSubtitles(params);
    if (results.length === 0) {
      results = await searchLegacyOpenSubtitles(params, this.fallbackCache, this.fetchFn, this.logger);
    }
    if (results.length === 0) {
      return false;
    }

    const best = results[0];
    return await this.downloadAndWrite(best.fileId, destPath, {
      title: params.title,
      seasonNumber: params.seasonNumber,
      episodeNumber: params.episodeNumber,
    });
  }

  async downloadAndWriteMultiple(
    fileIds: (number | string)[],
    baseDestPath: string,
    fallbackContext?: Partial<FallbackSubtitleMeta>
  ): Promise<number> {
    if (!this.isConfigured() || fileIds.length === 0) {
      return 0;
    }

    const dir = path.dirname(baseDestPath);
    let baseName = path.basename(baseDestPath);

    baseName = baseName.replace(/\.(pt-br|pt-BR)(\.\d+)?\.srt$/i, '');
    baseName = baseName.replace(/\.[a-zA-Z0-9]{2,4}$/, '');

    let written = 0;
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      const filename = i === 0 ? `${baseName}.pt-BR.srt` : `${baseName}.pt-BR.${i + 1}.srt`;
      const targetPath = path.join(dir, filename);
      const ok = await this.downloadAndWrite(fileId, targetPath, fallbackContext);
      if (ok) {
        written++;
      }
    }

    return written;
  }
}
