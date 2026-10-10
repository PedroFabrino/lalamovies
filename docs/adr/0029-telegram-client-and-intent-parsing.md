# 0029. Telegram Client and Intent Parsing

We introduced a dedicated Telegram Client service (`apps/telegram-bot`) providing conversational request intake, visual poster card selection, Gemini-powered intent parsing with personal key overrides, and direct lifecycle notifications.

## Context & Decision

Users want to submit requests and track downloads naturally via Telegram (e.g., *"Baixe a serie Lanternas"*) without having to open the web portal. However, freeform natural text is error-prone to parse with static regex, and embedding a bot inside `apps/api` would breach service boundaries and monolith limits. Furthermore, users require access to visual TMDB covers, smart defaults (auto-snatching top-scored torrents or creating Waitlist Entries), episodic tracking options ("Watch for Next Episodes"), and personal notification feedback.

We decided to:
1. **Isolated Service Boundary**: Deploy `apps/telegram-bot` as an independent TypeScript container running Telegram Long Polling, communicating with `apps/api` via internal REST endpoints. This eliminates inbound networking/webhook complexity and isolates bot execution from the core API.
2. **Account Pairing & Authorization**: Secure access through 1-on-1 private chats mapped to MDM User accounts via short-lived pairing tokens (`/link <code>`), persisting `telegram_chat_id` on the `users` table to maintain RBAC role boundaries (`user`, `trusted`, `admin`).
3. **Hybrid Intent Parsing**: Parse natural language using Gemini Flash with structured schema extraction (`{ action, title, mediaType, seasonNumber, episodeNumber, isSeasonPack }`). Slash commands (`/filme`, `/serie`, `/baixar`, `/status`) provide immediate zero-cost fallbacks.
4. **Global AI Key Feature Flag**: Introduce a runtime Feature Flag (`global_gemini_api_key`) controlling access to the system `.env` `GEMINI_API_KEY`. When toggled off, users must supply their own personal Gemini API key via web settings or the `/apikey` bot command.
5. **Paged Interactive Cards & Smart Defaults**: Render TMDB search results in a single Telegram photo message that edits in-place with `[⬅️ Anterior]`, `[Próximo ➡️]`, and `[✅ Selecionar]` buttons. When selected, the bot queries `/requests/series-progress` for series/anime, offers `[Temporada Completa]` or `[Episódio Específico]`, provides a `[🔔 Acompanhar Novos Episódios]` toggle, and auto-snatches the top-scoring Prowlarr release with an override button for alternative torrents.
6. **Direct Telegram Notifications**: Extend `apps/api/src/services/notifications.ts` to dispatch download completion, hardlinking, and failure alerts directly to the user's `telegram_chat_id` using the Telegram Bot API.
