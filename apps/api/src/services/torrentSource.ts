import { parseTorrentBuffer } from './torrentParser';

export function extractHashFromMagnet(magnetLink: string): string {
  const match = magnetLink.match(/urn:btih:([a-zA-Z0-9]+)/i);
  if (!match) return '';
  const raw = match[1];
  if (raw.length === 40) {
    return raw.toLowerCase();
  }
  if (raw.length === 32) {
    // Decode 32-char Base32 RFC 4648 to 40-char hex
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of raw.toUpperCase()) {
      const val = base32chars.indexOf(char);
      if (val === -1) return raw.toLowerCase();
      bits += val.toString(2).padStart(5, '0');
    }
    let hex = '';
    for (let i = 0; i + 4 <= bits.length; i += 4) {
      hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
    }
    return hex.toLowerCase();
  }
  return raw.toLowerCase();
}

export async function resolveTorrentSource(source: string): Promise<{
  resolvedMagnet?: string;
  torrentBuffer?: Buffer;
  hash?: string;
}> {
  if (!source.startsWith('http://') && !source.startsWith('https://')) {
    const hash = extractHashFromMagnet(source);
    return { resolvedMagnet: source, hash };
  }

  try {
    let currentUrl = source;
    for (let i = 0; i < 5; i++) {
      const res = await fetch(currentUrl, { redirect: 'manual' });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) break;
        if (loc.startsWith('magnet:')) {
          const hash = extractHashFromMagnet(loc);
          return { resolvedMagnet: loc, hash };
        }
        currentUrl = new URL(loc, currentUrl).toString();
        continue;
      }

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Check if bencoded torrent dictionary starts with 'd' (ASCII 100)
        if (buffer.length > 0 && buffer[0] === 0x64) {
          try {
            const { infoHash } = parseTorrentBuffer(buffer);
            return { torrentBuffer: buffer, hash: infoHash };
          } catch {
            // Not parseable, return buffer anyway
            return { torrentBuffer: buffer };
          }
        }
      }
      break;
    }
  } catch {
    // If fetching fails, fallback to passing URL directly
  }

  return { resolvedMagnet: source, hash: '' };
}
