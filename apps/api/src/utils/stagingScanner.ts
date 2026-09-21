import fs from 'node:fs';
import path from 'node:path';

export interface DiskFileInfo {
  name: string;
  size: number;
}

/**
 * Reconstructs file list with sizes from disk staging directory.
 * Reads the staging sub-directory named after req.qbTorrentHash (or req.title if no hash).
 * Returns entries as { name: string; size: number } using fs.promises.stat for sizes.
 * Returns empty array gracefully if target directory does not exist or is not a directory.
 */
export async function reconstructFilesFromDisk(
  stagingDir: string,
  subDir?: string
): Promise<DiskFileInfo[]> {
  const targetDir = subDir ? path.join(stagingDir, subDir) : stagingDir;
  const prefix = subDir
    ? subDir.replace(/\\/g, '/')
    : path.basename(stagingDir).replace(/\\/g, '/');

  try {
    const stat = await fs.promises.stat(targetDir);
    if (!stat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  try {
    const entries = await fs.promises.readdir(targetDir, { recursive: true });
    const results: DiskFileInfo[] = [];

    for (const entry of entries) {
      const fullPath = path.join(targetDir, entry);
      try {
        const fileStat = await fs.promises.stat(fullPath);
        if (fileStat.isFile()) {
          const normalizedEntry = entry.replace(/\\/g, '/');
          const name = prefix ? `${prefix}/${normalizedEntry}` : normalizedEntry;
          results.push({
            name,
            size: fileStat.size,
          });
        }
      } catch {
        // Ignore inaccessible files
      }
    }

    return results;
  } catch {
    return [];
  }
}
