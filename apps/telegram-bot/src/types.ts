export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface MdmUser {
  id: string;
  username: string;
  role: string;
  personalGeminiApiKey?: string | null;
}

export type IntentAction = 'search' | 'status' | 'link' | 'apikey' | 'help' | 'unknown';
export type MediaType = 'movie' | 'tv_show' | 'anime';

export interface ParsedIntent {
  action: IntentAction;
  title?: string;
  mediaType?: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  isSeasonPack?: boolean;
  arg?: string;
  raw?: string;
}

export interface MetadataCandidate {
  id: number;
  title: string;
  mediaType: MediaType;
  year?: number | null;
  posterUrl?: string | null;
  overview?: string | null;
  romajiTitle?: string | null;
  englishTitle?: string | null;
}

export interface SeriesProgressResult {
  hasProgress: boolean;
  suggestedSeason?: number;
  suggestedEpisode?: number;
  totalDownloadedEpisodes?: number;
}

export interface ReleaseCandidate {
  title: string;
  downloadUrl: string;
  infoHash?: string;
  indexer: string;
  sizeBytes: number;
  seeders: number;
  resolution?: string;
  score?: number;
}

export interface SearchReleasesResponse {
  recommendedRelease?: ReleaseCandidate | null;
  releases: ReleaseCandidate[];
  isFutureOrUnreleased?: boolean;
}

export interface ReportItem {
  id: string;
  title: string;
  mediaType: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  status: string;
  downloadedAt?: string | null;
}

export interface ReportWaitlistItem {
  id: string;
  title: string;
  mediaType: string;
  seasonNumber?: number | null;
  targetEpisode?: number | null;
  status: string;
}

export interface UserReportResponse {
  telegramReportMessageId: number | null;
  active: ReportItem[];
  completed: ReportItem[];
  waitlist: ReportWaitlistItem[];
}
