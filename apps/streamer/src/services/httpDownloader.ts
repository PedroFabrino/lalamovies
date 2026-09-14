import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface IDirectDownloader {
  downloadFile(url: string, destinationDir: string, filename?: string): Promise<string>;
}

export class DirectDownloader implements IDirectDownloader {
  async downloadFile(url: string, destinationDir: string, filename?: string): Promise<string> {
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    // Determine filename from url or parameter
    let finalName = filename;
    if (!finalName) {
      try {
        const urlObj = new URL(url);
        finalName = path.basename(urlObj.pathname);
      } catch {
        finalName = `stream_file_${Date.now()}.mkv`;
      }
    }
    if (!finalName || finalName === '/' || finalName === '.') {
      finalName = `stream_file_${Date.now()}.mkv`;
    }

    const destPath = path.join(destinationDir, finalName);

    let startByte = 0;
    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      startByte = stat.size;
    }

    const headers: Record<string, string> = {};
    if (startByte > 0) {
      headers['Range'] = `bytes=${startByte}-`;
    }

    const res = await fetch(url, { headers });

    if (res.status === 416) {
      // Range not satisfiable -> already fully downloaded
      return destPath;
    }

    if (!res.ok && res.status !== 206) {
      throw new Error(`Direct download failed with HTTP ${res.status}`);
    }

    const isAppend = res.status === 206;
    const fileStream = fs.createWriteStream(destPath, { flags: isAppend ? 'a' : 'w' });

    if (!res.body) {
      throw new Error('Response body is null');
    }

    const nodeReadable = Readable.fromWeb(res.body as any);
    await pipeline(nodeReadable, fileStream);

    return destPath;
  }
}
