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
      throw new Error(`Failed to add magnet to Real-Debrid: HTTP ${response.status}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
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
