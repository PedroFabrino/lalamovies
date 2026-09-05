export interface ParsedTorrentClient {
  name: string;
  infoHash: string;
  totalSize: number;
  magnetUri: string;
}

export async function parseTorrentFile(fileOrBuffer: File | ArrayBuffer | Uint8Array): Promise<ParsedTorrentClient> {
  let uint8: Uint8Array;
  if (fileOrBuffer instanceof Uint8Array) {
    uint8 = fileOrBuffer;
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    uint8 = new Uint8Array(fileOrBuffer);
  } else {
    const arrayBuffer = await fileOrBuffer.arrayBuffer();
    uint8 = new Uint8Array(arrayBuffer);
  }

  let pos = 0;
  let infoStart = -1;
  let infoEnd = -1;
  const decoder = new TextDecoder('utf-8');

  function decode(): any {
    if (pos >= uint8.length) {
      throw new Error('Unexpected end of torrent file');
    }
    const byte = uint8[pos];

    if (byte === 0x69) {
      // 'i' -> integer
      pos++;
      let end = pos;
      while (end < uint8.length && uint8[end] !== 0x65) {
        end++;
      }
      if (end >= uint8.length) throw new Error('Unterminated integer in torrent');
      const numStr = decoder.decode(uint8.subarray(pos, end));
      pos = end + 1;
      return parseInt(numStr, 10);
    }

    if (byte === 0x6c) {
      // 'l' -> list
      pos++;
      const list: any[] = [];
      while (pos < uint8.length && uint8[pos] !== 0x65) {
        list.push(decode());
      }
      pos++; // skip 'e'
      return list;
    }

    if (byte === 0x64) {
      // 'd' -> dictionary
      pos++;
      const dict: Record<string, any> = {};
      while (pos < uint8.length && uint8[pos] !== 0x65) {
        const key = decodeString();
        const isInfo = key === 'info' && infoStart === -1;
        if (isInfo) {
          infoStart = pos;
        }
        const val = decode();
        if (isInfo) {
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
    return decoder.decode(buf);
  }

  function decodeBuffer(): Uint8Array {
    let colon = pos;
    while (colon < uint8.length && uint8[colon] !== 0x3a) {
      colon++;
    }
    if (colon >= uint8.length) throw new Error('Invalid string in torrent');
    const lenStr = decoder.decode(uint8.subarray(pos, colon));
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || len < 0) throw new Error(`Invalid length: ${lenStr}`);
    pos = colon + 1;
    const end = pos + len;
    if (end > uint8.length) throw new Error('String out of bounds in torrent');
    const res = uint8.subarray(pos, end);
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

  const infoBytes = uint8.slice(infoStart, infoEnd);
  const hashBuf = await crypto.subtle.digest('SHA-1', infoBytes);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const infoHash = hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');

  const rawName = root.info.name;
  const name = typeof rawName === 'string'
    ? rawName
    : rawName instanceof Uint8Array
      ? decoder.decode(rawName)
      : 'Unknown Torrent';

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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
