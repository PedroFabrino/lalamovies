export interface DebridTorrentInfo {
  id: string;
  filename: string;
  status: string;
  progress: number;
  links: string[];
}

export interface IDebridService {
  checkCache(hashes: string[]): Promise<Record<string, boolean>>;
  addMagnet(magnet: string): Promise<string>;
  addTorrent(fileBuffer: Buffer | Uint8Array): Promise<string>;
  resolveAndAdd(
    source: string,
    infoHash?: string,
    title?: string
  ): Promise<{ id: string; resolvedMagnet: string }>;
  selectFiles(torrentId: string, files?: string): Promise<void>;
  getTorrentInfo(torrentId: string): Promise<DebridTorrentInfo>;
  getUnrestrictedLinks(torrentId: string): Promise<string[]>;
  deleteTorrent(torrentId: string): Promise<void>;
}

export class DebridService implements IDebridService {
  private baseUrl = 'https://api.real-debrid.com/rest/1.0';
  private apiKey: string;
  private maxRetries = 3;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.REALDEBRID_API_KEY || '';
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 429) {
          attempt++;
          if (attempt > this.maxRetries) {
            throw new Error(`Real-Debrid API rate limit reached (HTTP 429) after ${this.maxRetries} retries`);
          }
          const retryAfter = response.headers.get('retry-after');
          const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 200;
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        return response;
      } catch (err: unknown) {
        if (attempt >= this.maxRetries) {
          throw err;
        }
        attempt++;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 200));
      }
    }

    throw new Error('Real-Debrid request failed');
  }

  async checkCache(hashes: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    if (!hashes || hashes.length === 0) {
      return results;
    }

    const cleanHashes = hashes
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);

    for (const h of cleanHashes) {
      results[h] = false;
    }

    if (!this.apiKey || cleanHashes.length === 0) {
      return results;
    }

    const hashPath = cleanHashes.join('/');
    try {
      const response = await this.request(`/torrents/instantAvailability/${hashPath}`);
      if (!response.ok) {
        return results;
      }

      const data = (await response.json()) as Record<
        string,
        { rd?: Array<Record<string, { filename: string; filesize: number }>> }
      >;

      if (data && typeof data === 'object') {
        for (const [hashKey, val] of Object.entries(data)) {
          const lowerHash = hashKey.toLowerCase();
          const isCached = Array.isArray(val?.rd) && val.rd.length > 0;
          results[lowerHash] = isCached;
        }
      }

      return results;
    } catch {
      return results;
    }
  }

  private async formatDebridError(prefix: string, response: Response): Promise<string> {
    const errText = await response.text().catch(() => '');
    let detail = '';
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error_details) {
        detail = `: ${parsed.error_details}`;
      } else if (parsed.error) {
        detail = `: ${parsed.error}`;
      }
    } catch {
      if (errText) detail = `: ${errText}`;
    }
    return `${prefix}: HTTP ${response.status}${detail}`;
  }

  async addMagnet(magnet: string): Promise<string> {
    const form = new URLSearchParams();
    form.append('magnet', magnet);

    const response = await this.request('/torrents/addMagnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const msg = await this.formatDebridError('Failed to add magnet to Real-Debrid', response);
      throw new Error(msg);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  async addTorrent(fileBuffer: Buffer | Uint8Array): Promise<string> {
    const response = await this.request('/torrents/addTorrent', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-bittorrent',
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const msg = await this.formatDebridError('Failed to add torrent file to Real-Debrid', response);
      throw new Error(msg);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  async resolveAndAdd(
    source: string,
    infoHash?: string,
    title?: string
  ): Promise<{ id: string; resolvedMagnet: string }> {
    // 1. If already a magnet URI, add directly
    if (source.startsWith('magnet:')) {
      const id = await this.addMagnet(source);
      return { id, resolvedMagnet: source };
    }

    // 2. If an HTTP/HTTPS URL, follow redirects and check for magnet redirect or torrent file
    if (source.startsWith('http://') || source.startsWith('https://')) {
      try {
        let currentUrl = source;
        for (let i = 0; i < 5; i++) {
          const res = await fetch(currentUrl, { redirect: 'manual' });
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get('location');
            if (!loc) break;
            if (loc.startsWith('magnet:')) {
              const id = await this.addMagnet(loc);
              return { id, resolvedMagnet: loc };
            }
            currentUrl = new URL(loc, currentUrl).toString();
            continue;
          }

          if (res.ok) {
            const contentType = (res.headers.get('content-type') || '').toLowerCase();
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // If binary torrent file (starts with 'd' / 0x64 or content-type is torrent)
            if (contentType.includes('application/x-bittorrent') || (buffer.length > 0 && buffer[0] === 0x64)) {
              const id = await this.addTorrent(buffer);
              const magnet = infoHash
                ? `magnet:?xt=urn:btih:${infoHash}${title ? `&dn=${encodeURIComponent(title)}` : ''}`
                : source;
              return { id, resolvedMagnet: magnet };
            }

            // If response body is a magnet URI string
            const text = buffer.toString('utf-8').trim();
            if (text.startsWith('magnet:')) {
              const id = await this.addMagnet(text);
              return { id, resolvedMagnet: text };
            }
          }
          break;
        }
      } catch {
        // Fetch failed, fall through to fallback below
      }
    }

    // 3. Fallback: if infoHash is provided, construct a magnet link and add
    if (infoHash) {
      const fallbackMagnet = `magnet:?xt=urn:btih:${infoHash}${title ? `&dn=${encodeURIComponent(title)}` : ''}`;
      const id = await this.addMagnet(fallbackMagnet);
      return { id, resolvedMagnet: fallbackMagnet };
    }

    // 4. Default: attempt addMagnet with source so that Real-Debrid returns its error
    const id = await this.addMagnet(source);
    return { id, resolvedMagnet: source };
  }

  async selectFiles(torrentId: string, files = 'all'): Promise<void> {
    const form = new URLSearchParams();
    form.append('files', files);

    const response = await this.request(`/torrents/selectFiles/${torrentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to select files on Real-Debrid: HTTP ${response.status}`);
    }
  }

  async getTorrentInfo(torrentId: string): Promise<DebridTorrentInfo> {
    const response = await this.request(`/torrents/info/${torrentId}`);
    if (!response.ok) {
      throw new Error(`Failed to get torrent info from Real-Debrid: HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      id: string;
      filename: string;
      status: string;
      progress: number;
      links: string[];
    };

    return {
      id: data.id,
      filename: data.filename || '',
      status: data.status || 'unknown',
      progress: typeof data.progress === 'number' ? data.progress : 0,
      links: Array.isArray(data.links) ? data.links : [],
    };
  }

  async getUnrestrictedLinks(torrentId: string): Promise<string[]> {
    const info = await this.getTorrentInfo(torrentId);
    if (!info.links || info.links.length === 0) {
      return [];
    }

    const unrestrictPromises = info.links.map(async (link) => {
      const form = new URLSearchParams();
      form.append('link', link);

      const res = await this.request('/unrestrict/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });

      if (!res.ok) {
        throw new Error(`Failed to unrestrict link: HTTP ${res.status}`);
      }

      const parsed = (await res.json()) as { download: string };
      return parsed.download;
    });

    return Promise.all(unrestrictPromises);
  }

  async deleteTorrent(torrentId: string): Promise<void> {
    const response = await this.request(`/torrents/delete/${torrentId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204 && response.status !== 404) {
      throw new Error(`Failed to delete torrent from Real-Debrid: HTTP ${response.status}`);
    }
  }
}
