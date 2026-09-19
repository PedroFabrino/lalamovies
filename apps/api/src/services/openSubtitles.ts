import fs from 'node:fs';
import path from 'node:path';

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

  constructor(options: OpenSubtitlesOptions = {}) {
    this.apiKey = options.apiKey?.trim() || '';
    this.baseUrl = options.baseUrl?.replace(/\/$/, '') || 'https://api.opensubtitles.com/api/v1';
    this.userAgent = options.userAgent || 'MDM Media Server v1.0';
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.logger = options.logger;
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

  async searchSubtitles(params: SearchSubtitlesParams): Promise<SubtitleSearchResult[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const url = new URL(`${this.baseUrl}/subtitles`);
      url.searchParams.set('languages', 'pt-br');
      url.searchParams.set('order_by', 'download_count');
      url.searchParams.set('order_direction', 'desc');

      if (params.tmdbId) {
        url.searchParams.set('tmdb_id', String(params.tmdbId));
      }
      if (params.title) {
        url.searchParams.set('query', params.title);
      }
      if (params.year) {
        url.searchParams.set('year', String(params.year));
      }
      if (params.seasonNumber != null) {
        url.searchParams.set('season_number', String(params.seasonNumber));
      }
      if (params.episodeNumber != null) {
        url.searchParams.set('episode_number', String(params.episodeNumber));
      }

      const res = await this.fetchFn(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        this.logger?.warn?.(`OpenSubtitles search failed with status ${res.status}: ${res.statusText}`);
        return [];
      }

      const json = (await res.json()) as any;
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

        parsedResults.push({
          fileId: firstFile.file_id,
          uploaderName: attrs.uploader?.name || 'Anonymous',
          downloadCount: Number(attrs.download_count) || 0,
          uploadDate: attrs.upload_date || '',
          fileSizeBytes: firstFile.file_size || attrs.file_size || undefined,
          releaseName: attrs.release || attrs.file_name || params.title,
        });
      }

      // Sort descending by downloadCount and take top 5
      parsedResults.sort((a, b) => b.downloadCount - a.downloadCount);
      return parsedResults.slice(0, 5);
    } catch (err) {
      this.logger?.warn?.(`OpenSubtitles search failed: ${(err as Error).message}`);
      return [];
    }
  }

  async downloadAndWrite(fileId: number | string, destPath: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const res = await this.fetchFn(`${this.baseUrl}/download`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ file_id: Number(fileId) }),
      });

      if (!res.ok) {
        this.logger?.error?.(`OpenSubtitles download ticket failed: HTTP ${res.status}`);
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
      return false;
    }
  }

  async fetchBest(params: SearchSubtitlesParams, destPath: string): Promise<boolean> {
    // If destination already exists as a directory (e.g. season pack folder), skip silently
    try {
      if (fs.existsSync(destPath) && fs.statSync(destPath).isDirectory()) {
        return false;
      }
    } catch {
      // ignore
    }

    const results = await this.searchSubtitles(params);
    if (results.length === 0) {
      return false;
    }

    const best = results[0];
    return await this.downloadAndWrite(best.fileId, destPath);
  }

  async downloadAndWriteMultiple(
    fileIds: (number | string)[],
    baseDestPath: string
  ): Promise<number> {
    if (!this.isConfigured() || fileIds.length === 0) {
      return 0;
    }

    // Determine base filename without extensions
    let dir = path.dirname(baseDestPath);
    let baseName = path.basename(baseDestPath);

    // If baseDestPath has a video or srt extension, strip it
    baseName = baseName.replace(/\.(pt-br|pt-BR)(\.\d+)?\.srt$/i, '');
    baseName = baseName.replace(/\.[a-zA-Z0-9]{2,4}$/, '');

    let written = 0;
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      const filename = i === 0 ? `${baseName}.pt-BR.srt` : `${baseName}.pt-BR.${i + 1}.srt`;
      const targetPath = path.join(dir, filename);
      const ok = await this.downloadAndWrite(fileId, targetPath);
      if (ok) {
        written++;
      }
    }

    return written;
  }
}
