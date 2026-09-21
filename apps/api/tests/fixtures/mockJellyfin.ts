import {
  IJellyfinService,
  JellyfinAuthResult,
  InvalidCredentialsError,
  JellyfinApiError,
} from '../../src/services/jellyfin';

export class MockJellyfinService implements IJellyfinService {
  public refreshCalled = 0;
  get refreshCount(): number {
    return this.refreshCalled;
  }
  set refreshCount(val: number) {
    this.refreshCalled = val;
  }
  public refreshed = false;
  public failRefresh = false;
  public playHistory: Record<string, string> = {};
  get globalPlayHistory(): Record<string, string> {
    return this.playHistory;
  }
  set globalPlayHistory(val: Record<string, string>) {
    this.playHistory = val;
  }
  public userPlayHistories: Record<string, Record<string, string>> = {};
  public deletedUserIds: Set<string> = new Set();
  public deletedUsers: string[] = [];
  public createdUsers: Array<{ username: string; id: string }> = [];
  public shouldFailCreate = false;
  public queriedUserIds: string[] = [];
  public setUserLibraryAccessCalls: { userId: string; role: string }[] = [];
  public failSetUserLibraryAccess = false;
  public syncedUserPermissions: Array<{ jellyfinUserId: string | null; role: 'user' | 'trusted' | 'admin' }> = [];
  public privateLibraryId: string | null = null;
  public publicUrl: string | undefined = undefined;

  async authenticateUser(username: string, password?: string): Promise<JellyfinAuthResult> {
    if (username === 'bad_user' || password === 'wrong_pass') {
      throw new InvalidCredentialsError();
    }
    if (username === 'server_error') {
      throw new JellyfinApiError('Connection refused');
    }
    return {
      accessToken: `token_${username}`,
      userId: `jf_${username}`,
      username,
      isAdmin: username.includes('admin'),
    };
  }

  async createUser(username = 'user', _password?: string): Promise<string> {
    if (this.shouldFailCreate) {
      throw new JellyfinApiError('Jellyfin user creation error', 500);
    }
    const id = `jf_${username}_${Date.now()}`;
    this.createdUsers.push({ username, id });
    return id;
  }

  async deleteUser(userId: string): Promise<void> {
    this.deletedUserIds.add(userId);
    this.deletedUsers.push(userId);
  }

  async refreshLibrary(): Promise<void> {
    if (this.failRefresh) {
      throw new Error('Jellyfin refresh failed: HTTP 401');
    }
    this.refreshCalled++;
    this.refreshed = true;
  }

  async safeRefresh(): Promise<void> {
    try {
      await this.refreshLibrary();
    } catch {
      // non-fatal
    }
  }

  getPublicJellyfinUrl(): string | undefined {
    return this.publicUrl;
  }

  async getPlayHistory(userId?: string): Promise<Record<string, string>> {
    if (userId) {
      this.queriedUserIds.push(userId);
      if (this.deletedUserIds.has(userId)) {
        const err: any = new Error('User not found (HTTP 404)');
        err.statusCode = 404;
        throw err;
      }
      return this.userPlayHistories[userId] || {};
    }
    return this.playHistory;
  }

  async ensureStreamLibrary(): Promise<string> {
    return 'stream_lib_id';
  }

  async checkStatus(): Promise<{
    reachable: boolean;
    authenticated: boolean;
    error?: string;
    serverName?: string;
    version?: string;
  }> {
    if (this.failRefresh) {
      return { reachable: true, authenticated: false, error: 'Authentication failed (HTTP 401)' };
    }
    return { reachable: true, authenticated: true, serverName: 'Test Jellyfin', version: '10.8.0' };
  }

  async discoverPrivateLibraryId(): Promise<string | null> {
    return this.privateLibraryId;
  }

  async setUserLibraryAccess(userId: string, role: 'user' | 'trusted' | 'admin'): Promise<void> {
    if (this.failSetUserLibraryAccess) {
      throw new Error('Jellyfin policy update failed: HTTP 500');
    }
    this.setUserLibraryAccessCalls.push({ userId, role });
  }

  async syncAllUserPermissions(
    users: Array<{ jellyfinUserId: string | null; role: 'user' | 'trusted' | 'admin' }>
  ): Promise<void> {
    this.syncedUserPermissions.push(...users);
  }

  getPrivateLibraryId(): string | null {
    return this.privateLibraryId;
  }

  setPrivateLibraryId(id: string | null): void {
    this.privateLibraryId = id;
  }
}

export const MockJellyfin = MockJellyfinService;
