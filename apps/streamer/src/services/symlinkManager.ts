import fs from 'node:fs';
import path from 'node:path';

export interface SymlinkManagerOptions {
  zurgMountPath?: string;
  streamPath?: string;
  logger?: {
    info: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
    warn?: (msg: string) => void;
  };
}

export class SymlinkManager {
  readonly zurgMountPath: string;
  readonly streamPath: string;
  private logger?: {
    info: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
    warn?: (msg: string) => void;
  };

  constructor(options: SymlinkManagerOptions = {}) {
    this.zurgMountPath = (options.zurgMountPath || process.env.ZURG_MOUNT_PATH || '/media_data/.zurg').replace(/\\/g, '/');
    this.streamPath = (options.streamPath || process.env.STREAM_PATH || '/media_data/stream').replace(/\\/g, '/');
    this.logger = options.logger;
  }

  resolveZurgEntry(target: string): string | null {
    if (!target) return null;
    const directPath = path.posix.join(this.zurgMountPath, target);
    if (fs.existsSync(directPath)) {
      return target;
    }

    try {
      if (!fs.existsSync(this.zurgMountPath)) {
        return null;
      }
      const entries = fs.readdirSync(this.zurgMountPath);
      const clean = (s: string) =>
        s
          .toLowerCase()
          .replace(/\.(mkv|mp4|avi|ts|mov|m4v)$/i, '')
          .replace(/[^a-z0-9]/g, '');

      const cleanTarget = clean(target);
      if (!cleanTarget) return null;

      const exactMatch = entries.find((e) => clean(e) === cleanTarget);
      if (exactMatch) return exactMatch;

      const substringMatch = entries.find((e) => {
        const cleanE = clean(e);
        return cleanE.includes(cleanTarget) || cleanTarget.includes(cleanE);
      });
      if (substringMatch) return substringMatch;
    } catch (err) {
      this.logger?.error(`Failed to scan zurgMountPath for ${target}`, err);
    }

    return null;
  }

  ensureStreamDirectory(): void {
    try {
      if (!fs.existsSync(this.streamPath)) {
        fs.mkdirSync(this.streamPath, { recursive: true });
      }
    } catch (err) {
      this.logger?.error(`Failed to ensure stream directory ${this.streamPath}`, err);
    }
  }

  createStreamSymlink(folderName: string): boolean {
    this.ensureStreamDirectory();
    const resolvedName = this.resolveZurgEntry(folderName) || folderName;
    const sourcePath = path.posix.join(this.zurgMountPath, resolvedName);
    const destPath = path.posix.join(this.streamPath, resolvedName);

    try {
      try {
        const lstat = fs.lstatSync(destPath);
        if (lstat.isSymbolicLink() || lstat.isFile() || lstat.isDirectory()) {
          fs.unlinkSync(destPath);
        }
      } catch {
        // Does not exist yet
      }

      const isDir = fs.existsSync(sourcePath) ? fs.statSync(sourcePath).isDirectory() : true;
      const linkType: fs.symlink.Type = process.platform === 'win32' ? (isDir ? 'junction' : 'file') : 'dir';

      fs.symlinkSync(sourcePath, destPath, linkType);
      this.logger?.info(`Created stream symlink: ${destPath} -> ${sourcePath}`);

      if (folderName !== resolvedName) {
        const aliasPath = path.posix.join(this.streamPath, folderName);
        try {
          const aliasLstat = fs.lstatSync(aliasPath);
          if (aliasLstat.isSymbolicLink() || aliasLstat.isFile() || aliasLstat.isDirectory()) {
            fs.unlinkSync(aliasPath);
          }
        } catch {
          // Does not exist yet
        }
        fs.symlinkSync(sourcePath, aliasPath, linkType);
        this.logger?.info(`Created stream alias symlink: ${aliasPath} -> ${sourcePath}`);
      }

      return true;
    } catch (err) {
      this.logger?.error(`Failed to create symlink for ${folderName}`, err);
      return false;
    }
  }

  removeStreamSymlink(folderName: string): boolean {
    const resolvedName = this.resolveZurgEntry(folderName) || folderName;
    const targets = new Set([folderName, resolvedName]);
    let removedAny = false;

    for (const name of targets) {
      const destPath = path.posix.join(this.streamPath, name);
      try {
        const lstat = fs.lstatSync(destPath);
        if (lstat.isSymbolicLink() || lstat.isFile()) {
          fs.unlinkSync(destPath);
          this.logger?.info(`Removed stream symlink: ${destPath}`);
          removedAny = true;
        } else if (lstat.isDirectory()) {
          fs.rmSync(destPath, { recursive: true, force: true });
          this.logger?.info(`Removed stream directory: ${destPath}`);
          removedAny = true;
        }
      } catch {
        // Doesn't exist
      }
    }
    return removedAny;
  }

  reconcileActiveStreams(activeFolderNames: string[]): void {
    this.ensureStreamDirectory();
    const resolvedAllowed = new Set<string>();
    for (const raw of activeFolderNames) {
      const name = raw?.trim();
      if (!name) continue;
      resolvedAllowed.add(name);
      const resolved = this.resolveZurgEntry(name);
      if (resolved) {
        resolvedAllowed.add(resolved);
      }
    }

    try {
      if (!fs.existsSync(this.streamPath)) {
        return;
      }

      const existingEntries = fs.readdirSync(this.streamPath);
      for (const entry of existingEntries) {
        if (!resolvedAllowed.has(entry)) {
          const entryPath = path.posix.join(this.streamPath, entry);
          try {
            const stat = fs.lstatSync(entryPath);
            if (stat.isSymbolicLink() || stat.isFile()) {
              fs.unlinkSync(entryPath);
            } else if (stat.isDirectory()) {
              fs.rmSync(entryPath, { recursive: true, force: true });
            }
            this.logger?.info(`Reconcile: removed unlisted stream entry ${entry}`);
          } catch (err) {
            this.logger?.error(`Reconcile: failed to remove ${entry}`, err);
          }
        }
      }

      for (const folder of activeFolderNames) {
        if (!folder?.trim()) continue;
        this.createStreamSymlink(folder.trim());
      }
    } catch (err) {
      this.logger?.error('Failed to reconcile active stream symlinks', err);
    }
  }
}
