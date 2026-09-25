import fs from 'node:fs';
import path from 'node:path';
import { IEpisodesRepository } from './episodesRepository';
import { IRequestsRepository } from './requestsRepository';
import { IQBittorrentService } from './qbittorrent';
import { IFileSystemService } from './fileSystem';
import { IJellyfinService } from './jellyfin';
import { extractEpisodeInfo } from '../utils/torrentTitleCleaner';

export interface PruneEpisodeResult {
  success: boolean;
  freedBytes: number;
  wholeRequestDeleted: boolean;
}

export interface IEpisodicPruningService {
  pruneEpisode(episodeId: string): Promise<PruneEpisodeResult>;
  backfillExistingSeasonPacks(): Promise<number>;
  pruneConsumedEpisodesUnderPressure(deficitBytes: number): Promise<number>;
}

export class EpisodicPruningService implements IEpisodicPruningService {
  private stagingPath: string;

  constructor(
    private episodesRepo: IEpisodesRepository,
    private requestsRepo: IRequestsRepository,
    private qbittorrent: IQBittorrentService,
    private fileSystem: IFileSystemService,
    private jellyfin: IJellyfinService,
    stagingPath?: string
  ) {
    this.stagingPath = stagingPath || process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads', 'staging');
  }

  async pruneEpisode(episodeId: string): Promise<PruneEpisodeResult> {
    const episode = this.episodesRepo.findById(episodeId);
    if (!episode) {
      throw new Error(`Episode not found: ${episodeId}`);
    }

    if (episode.status === 'pruned') {
      return { success: true, freedBytes: 0, wholeRequestDeleted: false };
    }

    const request = this.requestsRepo.findById(episode.requestId);
    if (!request) {
      throw new Error(`Parent request not found for episode: ${episodeId}`);
    }

    // 1. Set qBittorrent file priority to 0 ("do not download")
    if (request.qbTorrentHash && this.qbittorrent.setFilePriority) {
      try {
        await this.qbittorrent.setFilePriority(request.qbTorrentHash, episode.fileIndex, 0);
      } catch (err) {
        // Log or silently continue if torrent not in qBittorrent
      }
    }

    // 2. Unlink Jellyfin library file
    if (episode.jellyfinPath && fs.existsSync(episode.jellyfinPath)) {
      try {
        fs.unlinkSync(episode.jellyfinPath);
      } catch {
        // Ignore unlink error
      }
    }

    // 3. Unlink Staging file
    const stagingFile = path.isAbsolute(episode.relativePath)
      ? episode.relativePath
      : path.join(this.stagingPath, episode.relativePath);

    if (fs.existsSync(stagingFile)) {
      try {
        fs.unlinkSync(stagingFile);
      } catch {
        // Ignore unlink error
      }
    }

    // 4. Mark episode as pruned
    const now = new Date().toISOString();
    this.episodesRepo.update(episode.id, {
      status: 'pruned',
      prunedAt: now,
    });

    // 5. Invalidate footprint cache
    this.fileSystem.invalidateFootprintCache?.();

    // 6. Refresh Jellyfin library
    try {
      if (this.jellyfin.safeRefresh) {
        await this.jellyfin.safeRefresh();
      } else if (this.jellyfin.refreshLibrary) {
        await this.jellyfin.refreshLibrary();
      }
    } catch {
      // Ignore Jellyfin refresh error
    }

    // 7. Check if all episodes in pack are pruned
    const remainingUnpruned = this.episodesRepo.countUnprunedByRequestId(request.id);
    let wholeRequestDeleted = false;

    if (remainingUnpruned === 0) {
      wholeRequestDeleted = true;
      if (request.qbTorrentHash) {
        try {
          await this.qbittorrent.removeTorrent(request.qbTorrentHash, true);
        } catch {
          // Ignore removal error
        }
      }

      if (request.jellyfinPath && fs.existsSync(request.jellyfinPath)) {
        try {
          const contents = fs.readdirSync(request.jellyfinPath);
          if (contents.length === 0) {
            fs.rmdirSync(request.jellyfinPath);
          }
        } catch {
          // Ignore rmdir error
        }
      }

      this.requestsRepo.update(request.id, {
        status: 'deleted',
        deletedAt: now,
        deletionReason: 'cleanup',
      });
    }

    return {
      success: true,
      freedBytes: episode.sizeBytes,
      wholeRequestDeleted,
    };
  }

  async backfillExistingSeasonPacks(): Promise<number> {
    const seasonPackRequests = this.episodesRepo.findActiveSeasonPackRequests();
    let backfilledCount = 0;
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.ts', '.mov', '.webm', '.m4v'];

    for (const req of seasonPackRequests) {
      const existing = this.episodesRepo.findByRequestId(req.id);
      if (existing.length > 0) continue;

      let files: Array<{ index: number; name: string; size: number }> = [];

      if (req.qbTorrentHash && this.qbittorrent.getTorrentFiles) {
        try {
          const qbFiles = await this.qbittorrent.getTorrentFiles(req.qbTorrentHash);
          if (qbFiles && qbFiles.length > 0) {
            files = qbFiles;
          }
        } catch {
          // Ignore
        }
      }

      if (files.length === 0 && this.fileSystem.reconstructFilesFromDisk) {
        try {
          const diskFiles = await this.fileSystem.reconstructFilesFromDisk(this.stagingPath);
          files = diskFiles.map((f, i) => ({ index: i, name: f.name, size: f.size }));
        } catch {
          // Ignore
        }
      }

      const libraryDir = req.jellyfinPath;
      const episodesToInsert = [];
      let fileIdx = 0;

      for (const f of files) {
        const fileExt = path.extname(f.name).toLowerCase();
        if (!videoExtensions.includes(fileExt)) continue;

        const epInfo = extractEpisodeInfo(path.basename(f.name));
        if (epInfo.episodeNumber != null) {
          const seasonNum = epInfo.seasonNumber || req.seasonNumber || 1;
          const episodeNum = epInfo.episodeNumber;
          const fIndex = typeof f.index === 'number' ? f.index : fileIdx;

          const jellyPath = libraryDir
            ? path.join(libraryDir, path.basename(f.name))
            : path.join(this.stagingPath, f.name);

          episodesToInsert.push({
            id: `${req.id}-s${seasonNum}e${episodeNum}`,
            requestId: req.id,
            seasonNumber: seasonNum,
            episodeNumber: episodeNum,
            fileIndex: fIndex,
            relativePath: f.name,
            jellyfinPath: jellyPath,
            sizeBytes: f.size,
            status: 'downloaded' as const,
            keepFlag: false,
            lastPlayedAt: null,
            prunedAt: null,
          });
        }
        fileIdx++;
      }

      if (episodesToInsert.length > 0) {
        this.episodesRepo.createMany(episodesToInsert);
        backfilledCount += episodesToInsert.length;
      }
    }

    return backfilledCount;
  }

  async pruneConsumedEpisodesUnderPressure(deficitBytes: number): Promise<number> {
    if (deficitBytes <= 0) return 0;

    const consumedEpisodes = this.episodesRepo.findConsumedEpisodes();
    let totalFreed = 0;

    for (const ep of consumedEpisodes) {
      if (totalFreed >= deficitBytes) break;

      try {
        const result = await this.pruneEpisode(ep.id);
        if (result.success) {
          totalFreed += result.freedBytes;
        }
      } catch {
        // Continue pruning next candidate if one fails
      }
    }

    return totalFreed;
  }
}
