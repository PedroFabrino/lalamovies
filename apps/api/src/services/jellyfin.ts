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
}

export class JellyfinService implements IJellyfinService {
  private baseUrl: string;
  private apiKey: string;
  private clientName = 'MediaDownloadManager';
  private deviceName = 'WebServer';
  private deviceId = 'mdm-server';
  private version = '1.0.0';

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
}