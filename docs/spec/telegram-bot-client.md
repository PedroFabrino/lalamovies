# Spec: Telegram Bot Client with Intent Parsing

## Problem Statement

Users frequently want to request downloads or subscribe to episodic series while away from their computer or mobile browser (e.g. while chatting on mobile apps like Telegram). Currently, they must open the Media Download Manager web application, log in, search for media, navigate multiple modal steps, and evaluate torrent releases manually. There is no conversational or mobile-first chat mechanism to request media like *"Baixe a serie Lanternas"*, visually browse poster options, automatically snatch high-quality releases, or receive instant personal completion notifications in chat.

## Solution

A dedicated, lightweight Telegram Client container (`apps/telegram-bot`) that interacts with the existing MDM API via internal REST endpoints using Telegram Long Polling. 

The client allows authenticated users to:
1. Link their Telegram account to their MDM User record using a short-lived one-time pairing code generated in the Web UI or via `/link <code>`.
2. Send natural language requests in Portuguese or English, parsed into structured queries by Gemini Flash with deterministic slash-command fallbacks.
3. Visually browse TMDB metadata candidates in an interactive, single-message poster carousel with inline pagination buttons.
4. Select episodic preferences (Season Pack vs Single Episode with smart next-episode suggestions and a "Watch for Next Episodes" toggle).
5. Auto-snatch the top-scoring torrent release via Prowlarr or create a Waitlist Entry if unreleased, with an optional manual release override button.
6. Receive personal download completion, hardlinking, and failure notifications directly in their Telegram private chat.

## User Stories

1. As a User, I want to link my Telegram account to my MDM user account via a one-time code, so that my downloads, role permissions, and Jellyfin tracking are associated with my identity.
2. As a User, I want to type natural requests like "Baixe a serie Lanternas" in Telegram, so that I don't have to remember strict command syntax.
3. As a User, I want to see official TMDB poster art, year, and synopsis in Telegram, so that I can visually verify I am downloading the correct show or movie.
4. As a User, I want to browse multiple search candidates within a single message using Previous/Next buttons, so that the bot does not flood my chat with images.
5. As a User, I want the bot to automatically detect whether a request is a Movie or a Series, so that it asks for season/episode details only when necessary.
6. As a User requesting a TV show or Anime, I want to choose between a Season Pack or a specific episode, so that I don't waste disk space downloading an entire season if I only want one episode.
7. As a User requesting an episode, I want the bot to suggest the next un-downloaded episode based on my existing library history, so that I can request the next episode with one click.
8. As a User, I want to toggle "Watch for Next Episodes" on single-episode requests, so that future episodes are automatically added to the Waitlist and downloaded as they air.
9. As a User, I want the bot to automatically pick the highest-scoring torrent release from my preferred trackers, so that I get optimal quality without reviewing technical release details.
10. As a User, I want an "Escolher Outro Release" button, so that I can override the automatic selection and choose a specific release (e.g. 4K, 1080p, specific audio/subtitles) if I prefer.
11. As a User, I want media that is unreleased or missing qualifying releases to be placed on the Waitlist automatically, so that I don't have to keep searching manually.
12. As a User, I want to receive a direct Telegram notification when my download finishes and is available on Jellyfin, so that I know immediately when it is ready to watch.
13. As an Admin, I want a runtime Feature Flag (`global_gemini_api_key`) to decide whether all users share the system Gemini API key or must provide their own personal API key.
14. As a User, I want to store my personal Gemini API key in my web profile or via `/apikey`, so that I can use AI natural language parsing even if the global key is disabled.
15. As a User without an AI key, I want standard slash commands (`/filme`, `/serie`, `/status`) to work reliably, so that I can still use the bot without any AI dependencies.
16. As a User, I want to query `/status` in Telegram, so that I can view my active downloading and queued requests.
17. As an unauthorized Telegram user, I want the bot to prompt me to link my account with clear instructions, so that random strangers cannot trigger downloads on the server.
18. As a User in Telegram, I want to type `/login` or click an inline button to open a portal link that logs me in and automatically pairs my account with a return button back to Telegram, so that account linking is effortless.

## Implementation Decisions

- **Architecture & Packaging**: A dedicated microservice `apps/telegram-bot` configured in `docker-compose.yml`, running on Node.js/TypeScript using Long Polling (`getUpdates`). No inbound ports, public webhooks, or SSL proxy setups required.
- **Database Schema**: Extend the `users` table with:
  - `telegram_chat_id` (nullable, unique text)
  - `personal_gemini_api_key` (nullable text)
  - An ephemeral in-memory or Redis/SQLite pairing token cache storing `code -> userId` and `authSessionToken -> chatId` with expiration.
- **API Endpoints**:
  - `POST /auth/telegram-pairing/code` (authenticated): generates a random 6-character alphanumeric pairing code.
  - `POST /internal/telegram/pair`: internal endpoint validating pairing code and binding chat ID to user.
  - `POST /internal/telegram/auth-session`: generates an ephemeral browser login token for a Telegram chatId.
  - `POST /auth/telegram-pairing/claim`: claims an auth session token for the logged-in user and binds chatId.
  - `GET /internal/telegram/user/:chatId`: internal endpoint returning user record, role, and personal Gemini key.
  - `PUT /users/me/gemini-api-key`: allows users to update or clear their personal Gemini API key.
- **Intent Parsing**:
  - Uses Gemini Flash with structured schema output (`{ action: 'download' | 'status' | 'help', title: string, mediaType?: 'movie' | 'tv_show' | 'anime', seasonNumber?: number, episodeNumber?: number, isSeasonPack?: boolean }`).
  - Evaluates runtime Feature Flag `global_gemini_api_key`: uses `process.env.GEMINI_API_KEY` if enabled; otherwise uses user's `personal_gemini_api_key`.
  - Deterministic fallback to regex/slash commands (`/filme <título>`, `/serie <título>`, `/baixar <título>`, `/status`) if no API key is available or if AI request fails.
- **Telegram Inline Interaction**:
  - Single editable message for TMDB metadata browsing: uses `editMessageMedia` and `editMessageCaption` with inline navigation buttons `[⬅️ Anterior]`, `[Próximo ➡️]`, `[✅ Selecionar]`.
  - State tokenization: to satisfy Telegram's 64-byte `callback_data` limit, callbacks reference short search session IDs (e.g. `sel:<searchId>:<idx>`).
  - Series options: calls `GET /requests/series-progress` to present calculated next episode and toggles for `waitlistNextSeason` / Watch for Next Episodes.
  - Auto-snatch & Override: calls `POST /requests/search-releases`, selects recommended candidate, posts to `POST /requests`, and attaches `[🔍 Escolher Outro Release]` button for secondary candidate list.
- **Notification Integration**:
  - Update `apps/api/src/services/notifications.ts` to check `TELEGRAM_BOT_TOKEN` and user's `telegram_chat_id`.
  - Directly dispatches HTTP POST requests to `https://api.telegram.org/bot<token>/sendMessage` upon `download.completed`, `stream.ready`, or download failure events.
- **Web UI Additions**:
  - Add "Telegram & IA" card in user settings modal with "Gerar Código de Vinculação" button (displaying pairing code and countdown timer) and personal Gemini API key input.
  - Add `/telegram-auth` web view allowing instant account claim and return to Telegram (`t.me/<bot_username>`).

## Testing Decisions

- **Good Tests Principle**: Test external behavior through public APIs and mocked boundary contracts rather than internal class implementations.
- **API Integration Tests**:
  - Test pairing code generation, expiration, and conflict handling using Fastify test client (`app.inject`).
  - Test internal Telegram validation and chat ID binding.
  - Test personal Gemini API key CRUD and encryption/masking.
  - Test `notifications.ts` Telegram HTTP dispatch with mocked global fetch.
- **Bot Unit & Intent Tests**:
  - Test Intent Parser with mocked Gemini responses and test slash-command fallbacks.
  - Test Telegram conversation controller with mock Telegram context (inbound text, inline button callbacks).
  - Verify callback payload sizes never exceed 64 bytes.
- **Prior Art**:
  - Follow patterns in `apps/api/tests/notifications.test.ts` for webhook/dispatch testing.
  - Follow patterns in `apps/api/tests/auth.test.ts` for authentication and pairing token verification.

## Out of Scope

- Group chat management (bot operates strictly in 1-on-1 direct private messages).
- WhatsApp integration (deferred to a subsequent phase after Telegram client stabilizes).
- Inline torrent file upload directly via Telegram attachment.
- Administrative user management and invite generation via Telegram.

## Further Notes

- The bot leverages existing TMDB search, Prowlarr indexing, and series progress calculation endpoints without duplicating business logic.
- Long Polling ensures effortless local development and deployment behind CGNAT or home networks without port-forwarding.
