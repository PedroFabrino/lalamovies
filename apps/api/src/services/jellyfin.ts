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
  createUser?(username: string, password: string): Promise<string>;
  refreshLibrary?(): Promise<void>;
  getPlayHistory?(jellyfinUserId?: string): Promise<Record<string, string>>;
}

export class JellyfinService implements IJellyfinService {
  private baseUrl: string;
  private clientName = 'MediaDownloadManager';
  private deviceName = 'WebServer';
  private deviceId = 'mdm-server';
  private version = '1.0.0';

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || process.env.JELLYFIN_URL || 'http://localhost:8096').replace(/\/$/, '');
  }

  private getAuthHeader(): string {
    return `MediaBrowser Client="${this.clientName}", Device="${this.deviceName}", DeviceId="${this.deviceId}", Version="${this.version}"`;
  }

  async authenticateUser(username: string, password: string): Promise<JellyfinAuthResult> {
    const url = `${this.baseUrl}/Users/AuthenticateByName`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization': this.getAuthHeader(),
        },
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
}