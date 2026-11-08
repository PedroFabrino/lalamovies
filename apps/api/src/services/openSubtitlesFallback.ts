import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { TextDecoder } from 'node:util';
import type { OpenSubtitlesOptions, SearchSubtitlesParams, SubtitleSearchResult } from './openSubtitles';

export interface FallbackSubtitleMeta {
  imdbId?: number | null;
  parentImdbId?: number | null;
  legacySubtitleId?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  title?: string;
  releaseName?: string;
  directDownloadUrl?: string;
}

interface LegacySubtitleItem {
  IDSubtitleFile?: string;
  IDSubtitle?: string;
  SubFileName?: string;
  MovieReleaseName?: string;
  SubDownloadsCnt?: string;
  SubAddDate?: string;
  SubSize?: string;
  UserNickName?: string;
  SeriesSeason?: string;
  SeriesEpisode?: string;
  SubDownloadLink?: string;
}

const LEGACY_BASE_URL = 'https://rest.opensubtitles.org/search';
const LEGACY_USER_AGENT = 'TemporaryUserAgent';

export function decodeSubtitleBuffer(buf: Buffer): string {
  const unzipped =
    buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b
      ? zlib.gunzipSync(buf)
      : buf;

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(unzipped);
  } catch {
    return new TextDecoder('windows-1252').decode(unzipped);
  }
}

function buildLegacySearchUrl(parts: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(parts)
    .filter(([, val]) => val !== undefined && val !== null && String(val).trim() !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}-${encodeURIComponent(String(val).trim().toLowerCase())}`);

  return `${LEGACY_BASE_URL}/${entries.join('/')}`;
}

export async function searchLegacyOpenSubtitles(
  params: SearchSubtitlesParams,
  fallbackCache: Map<number, FallbackSubtitleMeta>,
  fetchFn: typeof fetch,
  logger?: OpenSubtitlesOptions['logger']
): Promise<SubtitleSearchResult[]> {
  try {
    const url = buildLegacySearchUrl({
      episode: params.episodeNumber,
      query: params.title,
      season: params.seasonNumber,
      sublanguageid: 'pob',
    });

    const res = await fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': LEGACY_USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return [];
    }

    const items = (await res.json()) as LegacySubtitleItem[];
    if (!Array.isArray(items)) {
      return [];
    }

    const results: SubtitleSearchResult[] = [];
    for (const item of items) {
      if (!item.IDSubtitleFile || !item.SubDownloadLink) continue;
      if (params.seasonNumber != null && Number(item.SeriesSeason) !== Number(params.seasonNumber)) {
        continue;
      }
      if (params.episodeNumber != null && Number(item.SeriesEpisode) !== Number(params.episodeNumber)) {
        continue;
      }

      const fileId = Number(item.IDSubtitleFile);
      if (!Number.isFinite(fileId)) continue;

      const releaseName = item.MovieReleaseName || item.SubFileName || params.title;
      fallbackCache.set(fileId, {
        seasonNumber: params.seasonNumber,
        episodeNumber: params.episodeNumber,
        title: params.title,
        releaseName,
        directDownloadUrl: item.SubDownloadLink,
      });

      results.push({
        fileId,
        uploaderName: item.UserNickName || 'Anonymous',
        downloadCount: Number(item.SubDownloadsCnt) || 0,
        uploadDate: item.SubAddDate || '',
        fileSizeBytes: Number(item.SubSize) || undefined,
        releaseName,
      });
    }

    results.sort((a, b) => b.downloadCount - a.downloadCount);
    return results.slice(0, 5);
  } catch (err) {
    logger?.warn?.(`Legacy OpenSubtitles search failed: ${(err as Error).message}`);
    return [];
  }
}

export async function downloadFromLegacyOpenSubtitles(
  fileId: number,
  destPath: string,
  meta: FallbackSubtitleMeta | undefined,
  fetchFn: typeof fetch,
  logger?: OpenSubtitlesOptions['logger']
): Promise<boolean> {
  try {
    let downloadUrl = meta?.directDownloadUrl;

    if (!downloadUrl) {
      const candidateUrls: string[] = [];
      if (meta?.imdbId) {
        candidateUrls.push(buildLegacySearchUrl({ imdbid: meta.imdbId, sublanguageid: 'pob' }));
      }
      if (meta?.parentImdbId && meta.seasonNumber != null && meta.episodeNumber != null) {
        candidateUrls.push(
          buildLegacySearchUrl({
            episode: meta.episodeNumber,
            imdbid: meta.parentImdbId,
            season: meta.seasonNumber,
            sublanguageid: 'pob',
          })
        );
      }
      if (meta?.title) {
        candidateUrls.push(
          buildLegacySearchUrl({
            episode: meta.episodeNumber,
            query: meta.title,
            season: meta.seasonNumber,
            sublanguageid: 'pob',
          })
        );
      }

      for (const searchUrl of candidateUrls) {
        const res = await fetchFn(searchUrl, {
          method: 'GET',
          headers: {
            'User-Agent': LEGACY_USER_AGENT,
            Accept: 'application/json',
          },
        });
        if (!res.ok) continue;

        const items = (await res.json()) as LegacySubtitleItem[];
        if (!Array.isArray(items) || items.length === 0) continue;

        const validItems = items.filter((i) => Boolean(i.SubDownloadLink));
        if (validItems.length === 0) continue;

        const matched =
          validItems.find((i) => Number(i.IDSubtitleFile) === fileId) ||
          (meta?.legacySubtitleId
            ? validItems.find((i) => Number(i.IDSubtitle) === Number(meta.legacySubtitleId))
            : undefined) ||
          (meta?.releaseName
            ? validItems.find(
                (i) =>
                  i.MovieReleaseName === meta.releaseName ||
                  i.SubFileName?.startsWith(meta.releaseName!)
              )
            : undefined) ||
          validItems.sort((a, b) => (Number(b.SubDownloadsCnt) || 0) - (Number(a.SubDownloadsCnt) || 0))[0];

        if (matched?.SubDownloadLink) {
          downloadUrl = matched.SubDownloadLink;
          break;
        }
      }
    }

    if (!downloadUrl) {
      return false;
    }

    const fileRes = await fetchFn(downloadUrl, {
      method: 'GET',
      headers: { 'User-Agent': LEGACY_USER_AGENT },
    });
    if (!fileRes.ok) {
      logger?.error?.(`Failed to download legacy subtitle from ${downloadUrl}: HTTP ${fileRes.status}`);
      return false;
    }

    const buf = Buffer.from(await fileRes.arrayBuffer());
    const content = decodeSubtitleBuffer(buf);

    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    if (fs.existsSync(destPath) && fs.statSync(destPath).isDirectory()) {
      logger?.warn?.(`Cannot write subtitle to directory path: ${destPath}`);
      return false;
    }

    fs.writeFileSync(destPath, content, 'utf8');
    logger?.info?.(`Successfully wrote subtitle (via legacy fallback) to ${destPath}`);
    return true;
  } catch (err) {
    logger?.error?.(`Legacy OpenSubtitles download fallback failed for fileId ${fileId}`, err);
    return false;
  }
}
