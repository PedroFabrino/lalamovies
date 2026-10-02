import crypto from 'node:crypto';

export interface SyncPlayGroupDetails {
  groupId: string;
  groupName: string;
  playingItemId?: string;
  participants?: string[];
}

export interface IJellyfinSyncPlayService {
  createSyncPlayGroup(groupName: string, itemId?: string, userToken?: string): Promise<{ groupId: string; groupName: string }>;
  getSyncPlayGroup(groupId: string, userToken?: string): Promise<SyncPlayGroupDetails | null>;
  listSyncPlayGroups(userToken?: string): Promise<SyncPlayGroupDetails[]>;
  setSyncPlayItem?(groupId: string, itemId: string, userToken?: string): Promise<void>;
  leaveSyncPlayGroup?(groupId?: string, userToken?: string): Promise<void>;
}

export class JellyfinSyncPlayService implements IJellyfinSyncPlayService {
  private baseUrl: string;
  private apiKey: string;
  private clientName = 'MediaDownloadManager';
  private deviceName = 'WebServer';
  private deviceId = 'mdm-syncplay';
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

  private getHeaders(userToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': this.getAuthHeader(),
    };
    const key = userToken || (this.getDynamicApiKey ? this.getDynamicApiKey() : null) || this.apiKey;
    if (key) {
      headers['X-Emby-Token'] = key;
    }
    return headers;
  }

  async listSyncPlayGroups(userToken?: string): Promise<SyncPlayGroupDetails[]> {
    const url = `${this.baseUrl}/SyncPlay/List`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(userToken),
      });
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as unknown;
      if (!Array.isArray(data)) return [];
      return data.map((item) => {
        const row = item as Record<string, unknown>;
        const participants = Array.isArray(row.Participants)
          ? row.Participants.map((p) => {
              if (p && typeof p === 'object') {
                const po = p as Record<string, unknown>;
                return String(po.UserId || po.UserName || po.name || '');
              }
              return String(p);
            })
          : [];
        return {
          groupId: String(row.GroupId || row.Id || row.groupId || ''),
          groupName: String(row.GroupName || row.Name || row.groupName || ''),
          playingItemId: row.PlayingItemId || row.playingItemId ? String(row.PlayingItemId || row.playingItemId) : undefined,
          participants,
        };
      });
    } catch {
      return [];
    }
  }

  async getSyncPlayGroup(groupId: string, userToken?: string): Promise<SyncPlayGroupDetails | null> {
    const groups = await this.listSyncPlayGroups(userToken);
    const found = groups.find((g) => g.groupId === groupId);
    return found || null;
  }

  async createSyncPlayGroup(
    groupName: string,
    itemId?: string,
    userToken?: string
  ): Promise<{ groupId: string; groupName: string }> {
    const url = `${this.baseUrl}/SyncPlay/New`;
    let createdGroupId: string | undefined;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          GroupName: groupName,
        }),
      });

      if (response.ok) {
        try {
          const data = (await response.json()) as Record<string, unknown>;
          if (data && (data.GroupId || data.Id || data.groupId)) {
            createdGroupId = String(data.GroupId || data.Id || data.groupId);
          }
        } catch {
          // 204 No Content is normal for Jellyfin SyncPlay/New
        }
      }
    } catch {
      // Soft failure, fallback below
    }

    if (!createdGroupId) {
      // Look up group in the list
      const groups = await this.listSyncPlayGroups(userToken);
      const match = groups.find((g) => g.groupName === groupName);
      if (match) {
        createdGroupId = match.groupId;
      }
    }

    if (!createdGroupId) {
      createdGroupId = crypto.randomUUID();
    }

    if (itemId) {
      await this.setSyncPlayItem(createdGroupId, itemId, userToken).catch(() => {});
    }

    return {
      groupId: createdGroupId,
      groupName,
    };
  }

  async setSyncPlayItem(groupId: string, itemId: string, userToken?: string): Promise<void> {
    const url = `${this.baseUrl}/SyncPlay/SetNewQueue`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          ItemIds: [itemId],
          PlayingItemPosition: 0,
          StartPositionTicks: 0,
        }),
      });
    } catch {
      // Non-fatal if client sets queue on join
    }
  }

  async leaveSyncPlayGroup(groupId?: string, userToken?: string): Promise<void> {
    const url = `${this.baseUrl}/SyncPlay/Leave`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          GroupId: groupId,
        }),
      });
    } catch {
      // Ignored
    }
  }
}
