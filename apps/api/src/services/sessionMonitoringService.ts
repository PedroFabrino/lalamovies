export interface PlaybackSessionItem {
  id: string;
  name: string;
  seriesName?: string;
  seasonName?: string;
  episodeIndex?: number;
  seasonIndex?: number;
  productionYear?: number;
  type: string;
  primaryImageTag?: string;
  backdropImageTag?: string;
  runTimeTicks?: number;
}

export interface PlaybackSessionPlayState {
  positionTicks?: number;
  isPaused: boolean;
  playMethod: 'DirectPlay' | 'DirectStream' | 'Transcode';
  repeatMode?: string;
}

export interface PlaybackSessionTranscodingInfo {
  audioCodec?: string;
  videoCodec?: string;
  container?: string;
  isVideoDirect?: boolean;
  isAudioDirect?: boolean;
  bitrate?: number;
  framerate?: number;
  completionPercentage?: number;
  transcodeReasons?: string[];
  hardwareAccelerationType?: string;
}

export interface PlaybackSession {
  id: string;
  userId?: string;
  userName: string;
  userPrimaryImageTag?: string;
  client: string;
  deviceName: string;
  deviceId?: string;
  applicationVersion?: string;
  nowPlayingItem?: PlaybackSessionItem;
  playState?: PlaybackSessionPlayState;
  transcodingInfo?: PlaybackSessionTranscodingInfo;
  playMethod: 'DirectPlay' | 'DirectStream' | 'Transcode';
  isHardwareAccelerated: boolean;
  bandwidthBps?: number;
}

export interface ISessionMonitoringService {
  getSessions(): Promise<PlaybackSession[]>;
  stopSession(sessionId: string, message?: string): Promise<void>;
}

interface RawJellyfinMediaStream {
  Type?: string;
  BitRate?: number;
}

interface RawJellyfinItem {
  Id: string;
  Name: string;
  SeriesName?: string;
  SeasonName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ProductionYear?: number;
  Type?: string;
  PrimaryImageTag?: string;
  ImageTags?: { Primary?: string; Backdrop?: string };
  BackdropImageTags?: string[];
  RunTimeTicks?: number;
  MediaStreams?: RawJellyfinMediaStream[];
}

interface RawJellyfinPlayState {
  PositionTicks?: number;
  IsPaused?: boolean;
  PlayMethod?: 'DirectPlay' | 'DirectStream' | 'Transcode';
  RepeatMode?: string;
}

interface RawJellyfinTranscodingInfo {
  AudioCodec?: string;
  VideoCodec?: string;
  Container?: string;
  IsVideoDirect?: boolean;
  IsAudioDirect?: boolean;
  Bitrate?: number;
  Framerate?: number;
  CompletionPercentage?: number;
  TranscodeReasons?: string[];
  HardwareAccelerationType?: string;
}

interface RawJellyfinSession {
  Id: string;
  UserId?: string;
  UserName?: string;
  UserPrimaryImageTag?: string;
  Client?: string;
  DeviceName?: string;
  DeviceId?: string;
  ApplicationVersion?: string;
  NowPlayingItem?: RawJellyfinItem;
  PlayState?: RawJellyfinPlayState;
  TranscodingInfo?: RawJellyfinTranscodingInfo;
}

export class SessionMonitoringService implements ISessionMonitoringService {
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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': `MediaBrowser Client="${this.clientName}", Device="${this.deviceName}", DeviceId="${this.deviceId}", Version="${this.version}"`,
    };
    const key = (this.getDynamicApiKey ? this.getDynamicApiKey() : null) || this.apiKey;
    if (key) {
      headers['X-Emby-Token'] = key;
    }
    return headers;
  }

  async getSessions(): Promise<PlaybackSession[]> {
    const url = `${this.baseUrl}/Sessions`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      const rawSessions = (await response.json()) as RawJellyfinSession[];
      if (!Array.isArray(rawSessions)) {
        return [];
      }

      return rawSessions
        .filter((s) => Boolean(s.NowPlayingItem))
        .map((s) => this.mapSession(s));
    } catch {
      return [];
    }
  }

  async stopSession(sessionId: string, message?: string): Promise<void> {
    const headers = this.getHeaders();
    if (message && message.trim().length > 0) {
      try {
        await fetch(`${this.baseUrl}/Sessions/${encodeURIComponent(sessionId)}/Message`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            Header: 'Administrator Notice',
            Text: message.trim(),
            TimeoutMs: 5000,
          }),
        });
      } catch {
        // Message delivery best-effort; proceed to stop playback
      }
    }

    const stopUrl = `${this.baseUrl}/Sessions/${encodeURIComponent(sessionId)}/Playing/Stop`;
    const response = await fetch(stopUrl, {
      method: 'POST',
      headers,
    });

    if (!response.ok && response.status !== 204 && response.status !== 200) {
      throw new Error(`Failed to stop Jellyfin session ${sessionId}: HTTP ${response.status}`);
    }
  }

  private mapSession(raw: RawJellyfinSession): PlaybackSession {
    const playStateMethod = raw.PlayState?.PlayMethod;
    const isTranscode =
      playStateMethod === 'Transcode' ||
      (raw.TranscodingInfo && raw.TranscodingInfo.IsVideoDirect === false);

    const isDirectStream =
      !isTranscode &&
      (playStateMethod === 'DirectStream' ||
        (raw.TranscodingInfo &&
          raw.TranscodingInfo.IsVideoDirect === true &&
          raw.TranscodingInfo.IsAudioDirect === false));

    const playMethod: 'DirectPlay' | 'DirectStream' | 'Transcode' = isTranscode
      ? 'Transcode'
      : isDirectStream
        ? 'DirectStream'
        : 'DirectPlay';

    const hwType = raw.TranscodingInfo?.HardwareAccelerationType;
    const isHardwareAccelerated = Boolean(
      isTranscode && hwType && hwType.toLowerCase() !== 'none'
    );

    let bandwidthBps = raw.TranscodingInfo?.Bitrate;
    if (!bandwidthBps && Array.isArray(raw.NowPlayingItem?.MediaStreams)) {
      const videoStream = raw.NowPlayingItem.MediaStreams.find((st) => st.Type === 'Video');
      if (videoStream?.BitRate) {
        bandwidthBps = videoStream.BitRate;
      }
    }

    const item: PlaybackSessionItem | undefined = raw.NowPlayingItem
      ? {
          id: raw.NowPlayingItem.Id,
          name: raw.NowPlayingItem.Name,
          seriesName: raw.NowPlayingItem.SeriesName,
          seasonName: raw.NowPlayingItem.SeasonName,
          episodeIndex: raw.NowPlayingItem.IndexNumber,
          seasonIndex: raw.NowPlayingItem.ParentIndexNumber,
          productionYear: raw.NowPlayingItem.ProductionYear,
          type: raw.NowPlayingItem.Type || 'Unknown',
          primaryImageTag: raw.NowPlayingItem.PrimaryImageTag || raw.NowPlayingItem.ImageTags?.Primary,
          backdropImageTag:
            Array.isArray(raw.NowPlayingItem.BackdropImageTags) && raw.NowPlayingItem.BackdropImageTags.length > 0
              ? raw.NowPlayingItem.BackdropImageTags[0]
              : raw.NowPlayingItem.ImageTags?.Backdrop,
          runTimeTicks: raw.NowPlayingItem.RunTimeTicks,
        }
      : undefined;

    const playState: PlaybackSessionPlayState | undefined = raw.PlayState
      ? {
          positionTicks: raw.PlayState.PositionTicks,
          isPaused: Boolean(raw.PlayState.IsPaused),
          playMethod,
          repeatMode: raw.PlayState.RepeatMode,
        }
      : undefined;

    const transcodingInfo: PlaybackSessionTranscodingInfo | undefined = raw.TranscodingInfo
      ? {
          audioCodec: raw.TranscodingInfo.AudioCodec,
          videoCodec: raw.TranscodingInfo.VideoCodec,
          container: raw.TranscodingInfo.Container,
          isVideoDirect: raw.TranscodingInfo.IsVideoDirect,
          isAudioDirect: raw.TranscodingInfo.IsAudioDirect,
          bitrate: raw.TranscodingInfo.Bitrate,
          framerate: raw.TranscodingInfo.Framerate,
          completionPercentage: raw.TranscodingInfo.CompletionPercentage,
          transcodeReasons: raw.TranscodingInfo.TranscodeReasons,
          hardwareAccelerationType: raw.TranscodingInfo.HardwareAccelerationType,
        }
      : undefined;

    return {
      id: raw.Id,
      userId: raw.UserId,
      userName: raw.UserName || 'Anonymous',
      userPrimaryImageTag: raw.UserPrimaryImageTag,
      client: raw.Client || 'Unknown Client',
      deviceName: raw.DeviceName || 'Unknown Device',
      deviceId: raw.DeviceId,
      applicationVersion: raw.ApplicationVersion,
      nowPlayingItem: item,
      playState,
      transcodingInfo,
      playMethod,
      isHardwareAccelerated,
      bandwidthBps,
    };
  }
}
