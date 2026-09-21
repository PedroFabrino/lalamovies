import fs from 'node:fs';
import path from 'node:path';

export class StorageFootprintService {
  private cachedFootprint: { bytes: number; timestamp: number } | null = null;
  private pendingFootprintPromise: Promise<number> | null = null;
  private readonly FOOTPRINT_CACHE_TTL_MS = 60_000;

  constructor(private defaultMediaBasePath: string) {}

  invalidateFootprintCache(): void {
    this.cachedFootprint = null;
    this.pendingFootprintPromise = null;
  }

  async getStorageFootprintBytes(
    targetPath?: string | string[],
    forceRefresh = false
  ): Promise<number> {
    if (
      !targetPath &&
      !forceRefresh &&
      this.cachedFootprint &&
      Date.now() - this.cachedFootprint.timestamp < this.FOOTPRINT_CACHE_TTL_MS
    ) {
      return this.cachedFootprint.bytes;
    }

    if (!targetPath && !forceRefresh && this.pendingFootprintPromise) {
      return this.pendingFootprintPromise;
    }

    const calcPromise = (async () => {
      let pathsToScan: string[] = [];
      if (targetPath) {
        pathsToScan = Array.isArray(targetPath) ? targetPath : [targetPath];
      } else {
        const candidates = [
          fs.existsSync('/media_data/downloads') ? '/media_data/downloads' : null,
          process.env.STAGING_PATH,
          this.defaultMediaBasePath,
        ].filter((p): p is string => Boolean(p && fs.existsSync(p)));

        if (candidates.length > 0) {
          pathsToScan = Array.from(new Set(candidates));
        } else {
          pathsToScan = [
            path.resolve(process.cwd(), 'downloads', 'staging'),
            this.defaultMediaBasePath,
          ];
        }
      }

      const seenInodes = new Set<string>();
      let totalBytes = 0;
      const stack: string[] = [...pathsToScan];

      while (stack.length > 0) {
        const current = stack.pop()!;
        let stat: fs.Stats;
        try {
          stat = await fs.promises.lstat(current);
        } catch {
          continue;
        }

        if (stat.isSymbolicLink()) {
          continue;
        }

        if (stat.isDirectory()) {
          const baseName = path.basename(current);
          if (baseName.startsWith('.') || baseName === 'stream') {
            continue;
          }

          try {
            const entries = await fs.promises.readdir(current);
            for (const entry of entries) {
              if (entry.startsWith('.') || entry === 'stream') {
                continue;
              }
              stack.push(path.join(current, entry));
            }
          } catch {
            // ignore read errors
          }
        } else if (stat.isFile()) {
          const inodeKey = `${stat.dev}:${stat.ino}`;
          if (!seenInodes.has(inodeKey)) {
            seenInodes.add(inodeKey);
            totalBytes += stat.size;
          }
        }
      }

      if (!targetPath) {
        this.cachedFootprint = { bytes: totalBytes, timestamp: Date.now() };
      }

      return totalBytes;
    })();

    if (!targetPath) {
      this.pendingFootprintPromise = calcPromise;
      try {
        return await calcPromise;
      } finally {
        this.pendingFootprintPromise = null;
      }
    }

    return await calcPromise;
  }
}
