import crypto from 'node:crypto';

export interface TelegramPairingCode {
  code: string;
  userId: string;
  expiresAt: number;
}

export interface TelegramAuthSession {
  token: string;
  chatId: string;
  expiresAt: number;
}

export interface ITelegramPairingService {
  generateCode(userId: string): { code: string; expiresInSeconds: number };
  verifyAndConsumeCode(code: string): string | null;
  peekCode(code: string): string | null;
  createAuthSession(chatId: string): { token: string; expiresInSeconds: number };
  consumeAuthSession(token: string): string | null;
  peekAuthSession(token: string): string | null;
  clear(): void;
}

export class TelegramPairingService implements ITelegramPairingService {
  private codes = new Map<string, TelegramPairingCode>();
  private authSessions = new Map<string, TelegramAuthSession>();
  private readonly ttlMs: number;
  private readonly sessionTtlMs: number;

  constructor(ttlMs = 10 * 60 * 1000, sessionTtlMs = 15 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.sessionTtlMs = sessionTtlMs;
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

  createAuthSession(chatId: string): { token: string; expiresInSeconds: number } {
    this.cleanupExpiredSessions();

    for (const [existingToken, entry] of this.authSessions.entries()) {
      if (entry.chatId === chatId) {
        this.authSessions.delete(existingToken);
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + this.sessionTtlMs;
    this.authSessions.set(token, {
      token,
      chatId,
      expiresAt,
    });

    return {
      token,
      expiresInSeconds: Math.floor(this.sessionTtlMs / 1000),
    };
  }

  consumeAuthSession(token: string): string | null {
    this.cleanupExpiredSessions();
    const normalized = token.trim();
    const entry = this.authSessions.get(normalized);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.authSessions.delete(normalized);
      return null;
    }

    this.authSessions.delete(normalized);
    return entry.chatId;
  }

  peekAuthSession(token: string): string | null {
    this.cleanupExpiredSessions();
    const normalized = token.trim();
    const entry = this.authSessions.get(normalized);
    if (!entry || Date.now() > entry.expiresAt) {
      return null;
    }
    return entry.chatId;
  }

  clear(): void {
    this.codes.clear();
    this.authSessions.clear();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [code, entry] of this.codes.entries()) {
      if (now > entry.expiresAt) {
        this.codes.delete(code);
      }
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [token, entry] of this.authSessions.entries()) {
      if (now > entry.expiresAt) {
        this.authSessions.delete(token);
      }
    }
  }
}
