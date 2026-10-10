import crypto from 'node:crypto';

export interface CallbackSession<T = unknown> {
  data: T;
  createdAt: number;
}

export class CallbackStore {
  private sessions = new Map<string, CallbackSession>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 15 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  save<T>(data: T): string {
    this.cleanup();
    const token = crypto.randomBytes(4).toString('hex');
    this.sessions.set(token, {
      data,
      createdAt: Date.now(),
    });
    return token;
  }

  get<T>(token: string): T | null {
    this.cleanup();
    const session = this.sessions.get(token);
    if (!session) return null;
    return session.data as T;
  }

  update<T>(token: string, data: T): void {
    const session = this.sessions.get(token);
    if (session) {
      session.data = data;
      session.createdAt = Date.now();
    }
  }

  delete(token: string): void {
    this.sessions.delete(token);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (now - session.createdAt > this.ttlMs) {
        this.sessions.delete(token);
      }
    }
  }
}
