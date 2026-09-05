export interface TorrentInfo {
  hash: string;
  name: string;
  progress: number; // 0 to 1
  dlspeed: number; // bytes/sec
  eta: number; // seconds
  state: string;
  size: number;
}

import { parseTorrentBuffer } from './torrentParser';

export class QBittorrentError extends Error {
  constructor(message: string, public statusCode = 502) {
    super(message);
    this.name = 'QBittorrentError';
  }
}

export interface IQBittorrentService {
  addTorrent(magnetLink: string, savePath?: string): Promise<string>;
  addTorrentFile(fileBuffer: Buffer | Uint8Array, savePath?: string, fileName?: string): Promise<string>;
  getActiveTorrentCount(): Promise<number>;
  getTorrentStatus(hash: string): Promise<TorrentInfo | null>;
  removeTorrent(hash: string, deleteFiles?: boolean): Promise<void>;
}

export class QBittorrentService implements IQBittorrentService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private sidCookie: string | null = null;

  constructor(baseUrl?: string, username?: string, password?: string) {
    this.baseUrl = (baseUrl || process.env.QBITTORRENT_URL || 'http://localhost:8080').replace(/\/$/, '');
    this.username = username || process.env.QBITTORRENT_USER || 'admin';
    this.password = password || process.env.QBITTORRENT_PASSWORD || 'adminadmin';
  }

  private extractHashFromMagnet(magnetLink: string): string {
    const match = magnetLink.match(/urn:btih:([a-zA-Z0-9]+)/i);
    return match ? match[1].toLowerCase() : '';
  }

  private async ensureAuthenticated(): Promise<string | null> {
    if (this.sidCookie) {
      return this.sidCookie;
    }

    try {
      const params = new URLSearchParams({
        username: this.username,
        password: this.password,
      });

      const res = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: this.baseUrl,
        },
        body: params.toString(),
      });

      if (!res.ok) {
        throw new QBittorrentError(`qBittorrent login failed: HTTP ${res.status}`);
      }

      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        const sidMatch = setCookie.match(/((?:QBT_)?SID(?:_\d+)?=[^;]+)/i);
        if (sidMatch) {
          this.sidCookie = sidMatch[1];
        } else {
          this.sidCookie = setCookie.split(';')[0].trim();
        }
      }

      return this.sidCookie;
    } catch (err) {
      if (err instanceof QBittorrentError) throw err;
      throw new QBittorrentError(`Could not connect to qBittorrent: ${(err as Error).message}`);
    }
  }

  private async fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
    const sid = await this.ensureAuthenticated();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (sid) {
      headers['Cookie'] = sid.includes('=') ? sid : `SID=${sid}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 403) {
      // Session expired, retry login once
      this.sidCookie = null;
      const newSid = await this.ensureAuthenticated();
      if (newSid) {
        headers['Cookie'] = newSid.includes('=') ? newSid : `SID=${newSid}`;
      }
      return fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
      });
    }

    return res;
  }

  async addTorrent(magnetLink: string, savePath?: string): Promise<string> {
    const hash = this.extractHashFromMagnet(magnetLink);
    const formData = new FormData();
    formData.append('urls', magnetLink);
    if (savePath) {
      formData.append('savepath', savePath);
    }

    try {
      const res = await this.fetchWithAuth('/api/v2/torrents/add', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new QBittorrentError(`Failed to add torrent: HTTP ${res.status}`);
      }

      const text = await res.text();
      if (text.trim() === 'Fails.') {
        throw new QBittorrentError('qBittorrent rejected the torrent magnet link');
      }

      return hash;
    } catch (err) {
      if (err instanceof QBittorrentError) throw err;
      throw new QBittorrentError(`Failed to add torrent to qBittorrent: ${(err as Error).message}`);
    }
  }

  async addTorrentFile(fileBuffer: Buffer | Uint8Array, savePath?: string, fileName = 'upload.torrent'): Promise<string> {
    const { infoHash } = parseTorrentBuffer(fileBuffer);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/x-bittorrent' });
    formData.append('torrents', blob, fileName);
    if (savePath) {
      formData.append('savepath', savePath);
    }

    try {
      const res = await this.fetchWithAuth('/api/v2/torrents/add', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new QBittorrentError(`Failed to add torrent file: HTTP ${res.status}`);
      }

      const text = await res.text();
      if (text.trim() === 'Fails.') {
        throw new QBittorrentError('qBittorrent rejected the torrent file');
      }

      return infoHash;
    } catch (err) {
      if (err instanceof QBittorrentError) throw err;
      throw new QBittorrentError(`Failed to add torrent file to qBittorrent: ${(err as Error).message}`);
    }
  }

  async getActiveTorrentCount(): Promise<number> {
    try {
      const res = await this.fetchWithAuth('/api/v2/torrents/info?filter=downloading');
      if (!res.ok) {
        return 0;
      }
      const data = (await res.json()) as Array<{ state: string }>;
      // Count actively downloading torrents
      const activeStates = ['downloading', 'stalledDL', 'metaDL', 'forcedDL', 'allocating'];
      return data.filter((t) => activeStates.includes(t.state)).length;
    } catch {
      return 0;
    }
  }

  async getTorrentStatus(hash: string): Promise<TorrentInfo | null> {
    if (!hash) return null;
    try {
      const res = await this.fetchWithAuth(`/api/v2/torrents/info?hashes=${encodeURIComponent(hash)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{
        hash: string;
        name: string;
        progress: number;
        dlspeed: number;
        eta: number;
        state: string;
        size: number;
      }>;

      if (!data || data.length === 0) return null;
      const item = data[0];
      return {
        hash: item.hash,
        name: item.name,
        progress: item.progress,
        dlspeed: item.dlspeed,
        eta: item.eta,
        state: item.state,
        size: item.size,
      };
    } catch {
      return null;
    }
  }

  async removeTorrent(hash: string, deleteFiles = false): Promise<void> {
    if (!hash) return;
    try {
      const params = new URLSearchParams({
        hashes: hash,
        deleteFiles: String(deleteFiles),
      });

      await this.fetchWithAuth('/api/v2/torrents/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (err) {
      if (err instanceof QBittorrentError) throw err;
      throw new QBittorrentError(`Failed to remove torrent: ${(err as Error).message}`);
    }
  }
}