export interface JellyfinAuthResult {
  accessToken: string;
  userId: string;
  username: string;
  isAdmin: boolean;
}

export class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid Jellyfin username or password') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class JellyfinApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'JellyfinApiError';
  }
}

export interface IJellyfinService {
  authenticateUser(username: string, password: string): Promise<JellyfinAuthResult>;
  createUser(username: string, password: string): Promise<string>;
  deleteUser(userId: string): Promise<void>;
  refreshLibrary?(): Promise<void>;
  getPlayHistory?(userId?: string): Promise<Record<string, string>>;
  ensureStreamLibrary?(): Promise<string>;
  checkStatus?(): Promise<{ reachable: boolean; authenticated: boolean; error?: string; serverName?: string; version?: string }>;
  discoverPrivateLibraryId?(): Promise<string | null>;
  setUserLibraryAccess?(jellyfinUserId: string, role: 'user' | 'trusted' | 'admin'): Promise<void>;
  getPrivateLibraryId?(): string | null;
  setPrivateLibraryId?(id: string | null): void;
}

export class JellyfinService implements IJellyfinService {
  private baseUrl: string;
  private apiKey: string;
  private clientName = 'MediaDownloadManager';
  private deviceName = 'WebServer';
  private deviceId = 'mdm-server';
  private version = '1.0.0';
  private privateLibraryId: string | null = null;

  constructor(
    baseUrl?: string,
    apiKey?: string,
    private getDynamicApiKey?: () => string | null | undefined
  ) {
    this.baseUrl = (baseUrl || process.env.JELLYFIN_URL || 'http://localhost:8096').replace(/\/$/, '');
    this.apiKey = apiKey || process.env.JELLYFIN_API_KEY || '';
  }

  private getAuthHeader(): string {
    return `MediaBrowser Client="${this.clientName}", Device="${this.deviceName}", DeviceId="${this.deviceId}", Version="${this.version}"`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': this.getAuthHeader(),
    };
    const key = (this.getDynamicApiKey ? this.getDynamicApiKey() : null) || this.apiKey;
    if (key) {
      headers['X-Emby-Token'] = key;
    }
    return headers;
  }

  async authenticateUser(username: string, password: string): Promise<JellyfinAuthResult> {
    const url = `${this.baseUrl}/Users/AuthenticateByName`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          Username: username,
          Pw: password,
        }),
      });

      if (response.status === 401 || response.status === 400) {
        throw new InvalidCredentialsError();
      }

      if (!response.ok) {
        throw new JellyfinApiError(`Jellyfin authentication failed with status ${response.status}`, response.status);
      }

      const data = (await response.json()) as {
        AccessToken: string;
        User: {
          Id: string;
          Name: string;
          Policy?: {
            IsAdministrator?: boolean;
          };
        };
      };

      return {
        accessToken: data.AccessToken,
        userId: data.User.Id,
        username: data.User.Name,
        isAdmin: data.User.Policy?.IsAdministrator ?? false,
      };
    } catch (err: unknown) {
      if (err instanceof InvalidCredentialsError || err instanceof JellyfinApiError) {
        throw err;
      }
      throw new JellyfinApiError(`Failed to connect to Jellyfin server: ${(err as Error).message}`);
    }
  }

  async createUser(username: string, password: string): Promise<string> {
    const url = `${this.baseUrl}/Users/New`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          Name: username,
          Password: password,
        }),
      });

      if (!response.ok) {
        throw new JellyfinApiError(`Failed to create Jellyfin user: HTTP ${response.status}`, response.status);
      }

      const data = (await response.json()) as { Id: string };
      return data.Id;
    } catch (err: unknown) {
      if (err instanceof JellyfinApiError) {
        throw err;
      }
      throw new JellyfinApiError(`Failed to connect to Jellyfin server: ${(err as Error).message}`);
    }
  }

  async refreshLibrary(): Promise<void> {
    const url = `${this.baseUrl}/Library/Refresh`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new JellyfinApiError(`Failed to refresh Jellyfin library: HTTP ${response.status}`, response.status);
      }
    } catch (err: unknown) {
      if (err instanceof JellyfinApiError) {
        throw err;
      }
      throw new JellyfinApiError(`Failed to connect to Jellyfin server: ${(err as Error).message}`);
    }
  }

  async checkStatus(): Promise<{ reachable: boolean; authenticated: boolean; error?: string; serverName?: string; version?: string }> {
    const url = `${this.baseUrl}/System/Info`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        return {
          reachable: true,
          authenticated: false,
          error: 'Authentication failed (HTTP 401/403). Check JELLYFIN_API_KEY.',
        };
      }

      if (!response.ok) {
        return {
          reachable: true,
          authenticated: false,
          error: `Jellyfin returned HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as { ServerName?: string; Version?: string };
      return {
        reachable: true,
        authenticated: true,
        serverName: data.ServerName,
        version: data.Version,
      };
    } catch (err: unknown) {
      return {
        reachable: false,
        authenticated: false,
        error: (err as Error).message || 'Connection refused or unreachable',
      };
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const url = `${this.baseUrl}/Users/${userId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok && response.status !== 404) {
        throw new JellyfinApiError(`Failed to delete Jellyfin user: HTTP ${response.status}`, response.status);
      }
    } catch (err: unknown) {
      if (err instanceof JellyfinApiError) {
        throw err;
      }
      throw new JellyfinApiError(`Failed to connect to Jellyfin server: ${(err as Error).message}`);
    }
  }

  async getPlayHistory(userId?: string): Promise<Record<string, string>> {
    const url = userId
      ? `${this.baseUrl}/Users/${userId}/Items?Recursive=true&Fields=UserData,Path`
      : `${this.baseUrl}/Items?Recursive=true&Fields=UserData,Path`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new JellyfinApiError(`Failed to fetch play history: HTTP ${response.status}`, response.status);
      }

      const data = (await response.json()) as {
        Items?: Array<{
          Path?: string;
          UserData?: {
            LastPlayedDate?: string;
            Played?: boolean;
          };
        }>;
      };

      const history: Record<string, string> = {};
      if (data.Items && Array.isArray(data.Items)) {
        for (const item of data.Items) {
          if (item.Path && item.UserData?.LastPlayedDate) {
            history[item.Path] = item.UserData.LastPlayedDate;
          }
        }
      }
      return history;
    } catch (err: unknown) {
      if (err instanceof JellyfinApiError) {
        throw err;
      }
      throw new JellyfinApiError(`Failed to connect to Jellyfin server: ${(err as Error).message}`);
    }
  }

  async ensureStreamLibrary(): Promise<string> {
    const listUrl = `${this.baseUrl}/Library/VirtualFolders`;
    try {
      const response = await fetch(listUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const folders = (await response.json()) as Array<{
          Name?: string;
          Locations?: string[];
          ItemId?: string;
          CollectionType?: string;
        }>;

        const existing = folders.find(
          (f) =>
            f.Name?.toLowerCase() === 'stream' ||
            f.Locations?.some((loc) => loc.includes('/media_data/stream') || loc.includes('/stream'))
        );

        if (existing?.ItemId) {
          return existing.ItemId;
        }
      }

      const createUrl = `${this.baseUrl}/Library/VirtualFolders?name=Stream&collectionType=mixed&paths=${encodeURIComponent('/media_data/stream')}&refreshLibrary=false`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!createRes.ok && createRes.status !== 409) {
        const simpleUrl = `${this.baseUrl}/Library/VirtualFolders?name=Stream&collectionType=mixed`;
        await fetch(simpleUrl, {
          method: 'POST',
          headers: this.getHeaders(),
        });
        const pathUrl = `${this.baseUrl}/Library/VirtualFolders/Paths?name=Stream&path=${encodeURIComponent('/media_data/stream')}`;
        await fetch(pathUrl, {
          method: 'POST',
          headers: this.getHeaders(),
        });
      }

      const verifyRes = await fetch(listUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (verifyRes.ok) {
        const folders = (await verifyRes.json()) as Array<{
          Name?: string;
          Locations?: string[];
          ItemId?: string;
        }>;

        const created = folders.find(
          (f) =>
            f.Name?.toLowerCase() === 'stream' ||
            f.Locations?.some((loc) => loc.includes('/media_data/stream') || loc.includes('/stream'))
        );

        if (created?.ItemId) {
          return created.ItemId;
        }
      }

      return 'stream-library-id';
    } catch (err: unknown) {
      if (err instanceof JellyfinApiError) {
        throw err;
      }
      throw new JellyfinApiError(`Failed to ensure Stream library: ${(err as Error).message}`);
    }
  }

  getPrivateLibraryId(): string | null {
    return this.privateLibraryId;
  }

  setPrivateLibraryId(id: string | null): void {
    this.privateLibraryId = id;
  }

  async discoverPrivateLibraryId(): Promise<string | null> {
    const listUrl = `${this.baseUrl}/Library/VirtualFolders`;
    try {
      const response = await fetch(listUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const folders = (await response.json()) as Array<{
        Name?: string;
        Locations?: string[];
        ItemId?: string;
      }>;

      const match = folders.find((f) =>
        f.Locations?.some((loc) => {
          const normalized = loc.replace(/\\/g, '/').toLowerCase();
          return normalized.includes('/media/private') || normalized.endsWith('/private');
        })
      );

      if (match?.ItemId) {
        this.privateLibraryId = match.ItemId;
        return match.ItemId;
      }
      return null;
    } catch {
      return null;
    }
  }

  async setUserLibraryAccess(jellyfinUserId: string, role: 'user' | 'trusted' | 'admin'): Promise<void> {
    let privateId = this.privateLibraryId;
    if (!privateId) {
      privateId = await this.discoverPrivateLibraryId();
    }

    if (!privateId) {
      console.warn('Private Library not found in Jellyfin — create a library pointing at /media/private to enable access control');
      return;
    }

    const listUrl = `${this.baseUrl}/Library/VirtualFolders`;
    let allFolderIds: string[] = [];
    try {
      const foldersRes = await fetch(listUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (foldersRes.ok) {
        const folders = (await foldersRes.json()) as Array<{ ItemId?: string }>;
        allFolderIds = folders.map((f) => f.ItemId).filter((id): id is string => Boolean(id));
      }
    } catch {
      // Best-effort retrieval of folder list
    }

    const userUrl = `${this.baseUrl}/Users/${jellyfinUserId}`;
    const userRes = await fetch(userUrl, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!userRes.ok) {
      throw new JellyfinApiError(`Failed to fetch Jellyfin user ${jellyfinUserId}: HTTP ${userRes.status}`, userRes.status);
    }

    const userData = (await userRes.json()) as {
      Policy?: {
        EnableAllFolders?: boolean;
        EnabledFolders?: string[];
        [key: string]: unknown;
      };
    };

    const policy = { ...(userData.Policy || {}) };
    let enabledFolders = Array.isArray(policy.EnabledFolders) ? [...policy.EnabledFolders] : [];

    if (policy.EnableAllFolders) {
      enabledFolders = Array.from(new Set([...enabledFolders, ...allFolderIds]));
    }

    policy.EnableAllFolders = false;
    if (role === 'user') {
      policy.EnabledFolders = enabledFolders.filter((id) => id !== privateId);
    } else {
      // role is 'trusted' or 'admin'
      if (!enabledFolders.includes(privateId)) {
        enabledFolders.push(privateId);
      }
      policy.EnabledFolders = enabledFolders;
    }

    const policyUrl = `${this.baseUrl}/Users/${jellyfinUserId}/Policy`;
    const updateRes = await fetch(policyUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(policy),
    });

    if (!updateRes.ok) {
      throw new JellyfinApiError(`Failed to update Jellyfin user policy for ${jellyfinUserId}: HTTP ${updateRes.status}`, updateRes.status);
    }
  }
}