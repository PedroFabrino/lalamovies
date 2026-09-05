import crypto from 'node:crypto';

export interface ParsedTorrent {
  name: string;
  infoHash: string;
  totalSize: number;
  magnetUri: string;
}

export function parseTorrentBuffer(inputBuffer: Uint8Array | Buffer): ParsedTorrent {
  const buffer = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer);
  let pos = 0;
  let infoStart = -1;
  let infoEnd = -1;

  function decode(): any {
    if (pos >= buffer.length) {
      throw new Error('Unexpected end of bencoded data');
    }
    const byte = buffer[pos];

    if (byte === 0x69) {
      // 'i' -> integer
      pos++;
      const end = buffer.indexOf(0x65, pos); // 'e'
      if (end === -1) throw new Error('Unterminated integer in bencode');
      const numStr = buffer.subarray(pos, end).toString('utf8');
      pos = end + 1;
      return parseInt(numStr, 10);
    }

    if (byte === 0x6c) {
      // 'l' -> list
      pos++;
      const list: any[] = [];
      while (pos < buffer.length && buffer[pos] !== 0x65) {
        list.push(decode());
      }
      pos++; // skip 'e'
      return list;
    }

    if (byte === 0x64) {
      // 'd' -> dictionary
      pos++;
      const dict: Record<string, any> = {};
      while (pos < buffer.length && buffer[pos] !== 0x65) {
        const key = decodeString();
        const isInfoKey = key === 'info' && infoStart === -1;
        if (isInfoKey) {
          infoStart = pos;
        }
        const val = decode();
        if (isInfoKey) {
          infoEnd = pos;
        }
        dict[key] = val;
      }
      pos++; // skip 'e'
      return dict;
    }

    return decodeBuffer();
  }

  function decodeString(): string {
    const buf = decodeBuffer();
    return buf.toString('utf8');
  }

  function decodeBuffer(): Buffer {
    const colon = buffer.indexOf(0x3a, pos); // ':'
    if (colon === -1) throw new Error('Invalid string length prefix in bencode');
    const lenStr = buffer.subarray(pos, colon).toString('utf8');
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || len < 0) throw new Error(`Invalid string length: ${lenStr}`);
    pos = colon + 1;
    const end = pos + len;
    if (end > buffer.length) throw new Error('String out of bounds in bencode');
    const res = buffer.subarray(pos, end);
    pos = end;
    return res;
  }

  const root = decode();
  if (!root || typeof root !== 'object' || !root.info) {
    throw new Error('Invalid torrent: missing info dictionary');
  }

  if (infoStart === -1 || infoEnd === -1) {
    throw new Error('Failed to locate info dictionary boundaries');
  }

  const infoBytes = buffer.subarray(infoStart, infoEnd);
  const infoHash = crypto.createHash('sha1').update(infoBytes).digest('hex').toLowerCase();

  const rawName = root.info.name;
  const name = typeof rawName === 'string'
    ? rawName
    : Buffer.isBuffer(rawName)
      ? rawName.toString('utf8')
      : 'Unknown Media';

  let totalSize = 0;
  if (typeof root.info.length === 'number') {
    totalSize = root.info.length;
  } else if (Array.isArray(root.info.files)) {
    for (const f of root.info.files) {
      if (f && typeof f.length === 'number') {
        totalSize += f.length;
      }
    }
  }

  const magnetUri = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}`;

  return {
    name,
    infoHash,
    totalSize,
    magnetUri,
  };
}
