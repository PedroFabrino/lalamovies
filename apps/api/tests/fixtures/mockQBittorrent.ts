import { IQBittorrentService, TorrentInfo } from '../../src/services/qbittorrent';
import { parseTorrentBuffer } from '../../src/services/torrentParser';

export class MockQBittorrentService implements IQBittorrentService {
  public torrents = new Map<string, TorrentInfo>();
  public torrentFiles = new Map<string, Array<{ name: string; size: number }>>();
  public removedTorrents: Array<{ hash: string; deleteFiles?: boolean }> = [];
  public addedTorrents: Array<{ magnetLink: string; savePath?: string }> = [];
  public addedTorrentFiles: Array<{ buffer: Buffer | Uint8Array; savePath?: string; fileName?: string }> = [];
  public allTorrents: TorrentInfo[] = [];
  public activeTorrentCount = 0;
  get activeCount(): number {
    return this.activeTorrentCount;
  }
  set activeCount(count: number) {
    this.activeTorrentCount = count;
  }
  public defaultHash = 'mock_hash_123';
  public defaultFileHash = 'mock_hash_file';
  public hashGenerator?: (magnetLink: string, count: number) => string;
  public defaultStatus: Partial<TorrentInfo> = {
    progress: 1,
    dlspeed: 0,
    eta: 0,
    state: 'seeding',
    size: 1000,
  };

  async addTorrent(magnetLink: string, savePath?: string): Promise<string> {
    this.addedTorrents.push({ magnetLink, savePath });
    const hash = this.hashGenerator
      ? this.hashGenerator(magnetLink, this.addedTorrents.length)
      : this.defaultHash;
    return hash;
  }

  async addTorrentFile(fileBuffer: Buffer | Uint8Array, savePath?: string, fileName?: string): Promise<string> {
    this.addedTorrentFiles.push({ buffer: fileBuffer, savePath, fileName });
    try {
      const { infoHash } = parseTorrentBuffer(fileBuffer);
      if (infoHash) return infoHash;
    } catch {
      // ignore
    }
    return this.defaultFileHash;
  }

  async getActiveTorrentCount(): Promise<number> {
    return this.activeTorrentCount;
  }

  async getTorrentStatus(hash: string): Promise<TorrentInfo | null> {
    if (this.torrents.has(hash)) {
      return this.torrents.get(hash) || null;
    }
    return {
      hash,
      name: 'mock_torrent',
      progress: 1,
      dlspeed: 0,
      eta: 0,
      state: 'seeding',
      size: 1000,
      ...this.defaultStatus,
    };
  }

  async getAllTorrents(): Promise<TorrentInfo[]> {
    return this.allTorrents.length > 0 ? this.allTorrents : Array.from(this.torrents.values());
  }

  async getTorrentFiles(hash: string): Promise<Array<{ name: string; size: number }>> {
    return this.torrentFiles.get(hash) || [];
  }

  async removeTorrent(hash: string, deleteFiles?: boolean): Promise<void> {
    this.removedTorrents.push({ hash, deleteFiles });
    this.torrents.delete(hash);
  }
}

export const MockQBittorrent = MockQBittorrentService;
