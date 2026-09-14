import { eq } from 'drizzle-orm';
import { StreamerDatabase, systemConfig } from '../db';

export interface JellyfinSession {
  Id: string;
  UserId?: string;
  UserName?: string;
  NowPlayingItem?: {
    Id: string;
    Name?: string;
    Path?: string;
  };
}

export interface IStreamerJellyfinService {
  ensureStreamLibrary(): Promise<string>;
  refreshStreamLibrary(): Promise<void>;
  getActiveSessions(): Promise<JellyfinSession[]>;
  findItemByPath(path: string): Promise<string | null>;
}

export class StreamerJellyfinService implements IStreamerJellyfinService {
  private baseUrl: string;
  private apiKey: string;
  private db?: StreamerDatabase;

  constructor(options?: { baseUrl?: string; apiKey?: string; db?: StreamerDatabase }) {
    this.baseUrl = (options?.baseUrl || process.env.JELLYFIN_URL || 'http://localhost:8096').replace(/\/+$/, '');
    this.apiKey = options?.apiKey || process.env.JELLYFIN_API_KEY || '';
    this.db = options?.db;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': 'MediaBrowser Client="MDM-Streamer", Device="Server", DeviceId="mdm-streamer", Version="1.0.0"',
    };
    if (this.apiKey) {
      headers['X-Emby-Token'] = this.apiKey;
    }
    return headers;
  }

  async ensureStreamLibrary(): Promise<string> {
    const listUrl = `${this.baseUrl}/Library/VirtualFolders`;
    try {
      const response = await fetch(listUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      let libraryId: string | null = null;
      if (response.ok) {
        const folders = (await response.json()) as Array<{
          Name?: string;
          Locations?: string[];
          ItemId?: string;
        }>;

        const existing = folders.find(
          (f) =>
            f.Name?.toLowerCase() === 'stream' ||
            f.Locations?.some((loc) => loc.includes('/media_data/stream') || loc.includes('/stream'))
        );

        if (existing?.ItemId) {
          libraryId = existing.ItemId;
        }
      }

      if (!libraryId) {
        const createUrl = `${this.baseUrl}/Library/VirtualFolders?name=Stream&collectionType=mixed&paths=${encodeURIComponent('/media_data/stream')}&refreshLibrary=false`;
        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: this.getHeaders(),
        });

        if (!createRes.ok && createRes.status !== 409) {
          await fetch(`${this.baseUrl}/Library/VirtualFolders?name=Stream&collectionType=mixed`, {
            method: 'POST',
            headers: this.getHeaders(),
          });
          await fetch(`${this.baseUrl}/Library/VirtualFolders/Paths?name=Stream&path=${encodeURIComponent('/media_data/stream')}`, {
            method: 'POST',
            headers: this.getHeaders(),
          });
        }

        const verifyRes = await fetch(listUrl, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (verifyRes.ok) {
          const folders = (await verifyRes.json()) as Array<{
            Name?: string;
            Locations?: string[];
            ItemId?: string;
          }>;

          const created = folders.find(
            (f) =>
              f.Name?.toLowerCase() === 'stream' ||
              f.Locations?.some((loc) => loc.includes('/media_data/stream') || loc.includes('/stream'))
          );

          if (created?.ItemId) {
            libraryId = created.ItemId;
          }
        }
      }

      const finalId = libraryId || 'stream-library-id';

      if (this.db) {
        const existing = this.db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.key, 'stream_library_id'))
          .get();

        if (existing) {
          this.db
            .update(systemConfig)
            .set({ value: finalId })
            .where(eq(systemConfig.key, 'stream_library_id'))
            .run();
        } else {
          this.db.insert(systemConfig).values({ key: 'stream_library_id', value: finalId }).run();
        }
      }

      return finalId;
    } catch (err) {
      throw new Error(`Failed to ensure Stream library: ${(err as Error).message}`);
    }
  }

  async refreshStreamLibrary(): Promise<void> {
    let libraryId: string | null = null;
    if (this.db) {
      const row = this.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'stream_library_id'))
        .get();
      if (row?.value) {
        libraryId = row.value;
      }
    }

    const url = libraryId
      ? `${this.baseUrl}/Items/${libraryId}/Refresh`
      : `${this.baseUrl}/Library/Refresh`;

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to refresh Jellyfin library: HTTP ${res.status}`);
    }
  }

  async getActiveSessions(): Promise<JellyfinSession[]> {
    const url = `${this.baseUrl}/Sessions`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Jellyfin sessions: HTTP ${res.status}`);
    }

    const sessions = (await res.json()) as JellyfinSession[];
    return sessions.filter((s) => Boolean(s.NowPlayingItem));
  }

  async findItemByPath(targetPath: string): Promise<string | null> {
    const url = `${this.baseUrl}/Items?Recursive=true&Fields=Path`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      Items?: Array<{
        Id: string;
        Path?: string;
        Name?: string;
      }>;
    };

    if (!data.Items || !Array.isArray(data.Items)) {
      return null;
    }

    const normalizedTarget = targetPath.toLowerCase().replace(/\\/g, '/');
    const matched = data.Items.find((item) => {
      if (!item.Path) return false;
      const normalizedItemPath = item.Path.toLowerCase().replace(/\\/g, '/');
      return (
        normalizedItemPath === normalizedTarget ||
        normalizedItemPath.endsWith(normalizedTarget) ||
        normalizedTarget.endsWith(normalizedItemPath)
      );
    });

    return matched ? matched.Id : null;
  }
}
