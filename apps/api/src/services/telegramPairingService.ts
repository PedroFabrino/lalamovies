import crypto from 'node:crypto';

export interface TelegramPairingCode {
  code: string;
  userId: string;
  expiresAt: number;
}

export interface ITelegramPairingService {
  generateCode(userId: string): { code: string; expiresInSeconds: number };
  verifyAndConsumeCode(code: string): string | null;
  peekCode(code: string): string | null;
  clear(): void;
}

export class TelegramPairingService implements ITelegramPairingService {
  private codes = new Map<string, TelegramPairingCode>();
  private readonly ttlMs: number;

  constructor(ttlMs = 10 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  generateCode(userId: string): { code: string; expiresInSeconds: number } {
    this.cleanupExpired();

    for (const [existingCode, entry] of this.codes.entries()) {
      if (entry.userId === userId) {
        this.codes.delete(existingCode);
      }
    }

    const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    do {
      code = '';
      const bytes = crypto.randomBytes(6);
      for (let i = 0; i < 6; i++) {
        code += charset[bytes[i] % charset.length];
      }
    } while (this.codes.has(code));

    const expiresAt = Date.now() + this.ttlMs;
    this.codes.set(code, {
      code,
      userId,
      expiresAt,
    });

    return {
      code,
      expiresInSeconds: Math.floor(this.ttlMs / 1000),
    };
  }

  verifyAndConsumeCode(code: string): string | null {
    this.cleanupExpired();
    const normalized = code.trim().toUpperCase();
    const entry = this.codes.get(normalized);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.codes.delete(normalized);
      return null;
    }

    this.codes.delete(normalized);
    return entry.userId;
  }

  peekCode(code: string): string | null {
    this.cleanupExpired();
    const normalized = code.trim().toUpperCase();
    const entry = this.codes.get(normalized);
    if (!entry || Date.now() > entry.expiresAt) {
      return null;
    }
    return entry.userId;
  }

  clear(): void {
    this.codes.clear();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [code, entry] of this.codes.entries()) {
      if (now > entry.expiresAt) {
        this.codes.delete(code);
      }
    }
  }
}
