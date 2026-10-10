# Spec: Telegram Pinned Report Card and Ephemeral Chat Cleanup

## Problem Statement

As users interact with the Telegram Bot to search for media, select episodes, override releases, and start downloads, the chat thread rapidly accumulates obsolete messages (e.g. initial text queries, search carousels, episodic keyboards, and multiple "Download Iniciado" notifications). This creates clutter and makes it difficult to track what is currently downloading, what recently finished, and what is on the waitlist. 

Users need a clean, app-like chat interface that always maintains a persistent high-level overview of their requests (a pinned Report Card) while ensuring that intermediate search and intake interactions are strictly ephemeral and self-cleaning.

## Solution

A two-zone chat management architecture:
1. **Persistent Pinned Report Card**: A single pinned overview message in the user's private Telegram chat displaying active downloads, recent completed downloads (up to 3 if capacity permits), active waitlist items, and an inline refresh button (`[🔄 Atualizar]`). When empty, it displays an onboarding message encouraging the user to submit their first download.
2. **Ephemeral Interaction Flow**: A single transient interaction message slot below the Report Card.
   - When the user sends a query (e.g. *"Baixe o anime Tougen Anki"*), the bot delivers the search carousel card and immediately deletes the user's incoming prompt message.
   - Advancing through steps (Carousel ➔ Episodic Choice ➔ Snatch Confirmation) deletes or edits previous messages so only the current step is active.
   - Once a download starts, the Report Card is updated with the new item in `[⏳ Baixando]`, and the ephemeral confirmation card remains until the download completes or a new request is started.
   - When a download completes, the backend deletes the "Download Iniciado" card, posts a new "Download Concluído" card (with push notification and Jellyfin link), and updates the pinned Report Card to mark the item as `[✅ Concluído]`.
   - Starting any new search/request cleans up the previous completed/confirmation card and resets the ephemeral workspace.

## User Stories

1. As a User, I want my incoming text commands/queries deleted after the bot responds, so that my chat log does not accumulate orphaned command text.
2. As a User, I want a single pinned Report Card at the top of my Telegram chat, so that I can see the status of all my downloads at a glance.
3. As a User, when I have no active downloads or history, I want the Report Card to show a welcoming prompt with request suggestions.
4. As a User, when I have active downloads, I want to see all of them listed in the Report Card with their media titles, season/episode indicators, and download status.
5. As a User, when I have many active downloads (e.g. 10+), I want the Report Card to show all active downloads while suppressing older completed items so the message remains focused and within Telegram message size limits.
6. As a User, when my active downloads are few (or none), I want the Report Card to show up to the 3 most recently completed downloads.
7. As a User, I want an interactive `[🔄 Atualizar]` button on the Report Card to refresh its contents in-place on demand.
8. As a User browsing search results, I want selecting a title to delete the carousel banner before displaying the episode options, keeping only one active card on screen.
9. As a User picking an episode or season, I want my choice to delete the episodic keyboard and display the snatch progress in-place.
10. As a User whose download completes, I want the "Download Iniciado" message deleted and replaced by a fresh "Download Concluído" message with a Jellyfin play link.
11. As a User starting a new request after a completed download, I want the old "Download Concluído" message deleted so my new search starts in a clean chat window.

## Implementation Decisions

- **Database Schema**:
  - Add `telegram_report_message_id: integer` to `users` table to track the user's pinned Report Card.
  - Add `telegram_snatch_message_id: integer` to `download_requests` table to track the ephemeral "Download Iniciado" message for each request.
- **Repository Seam**:
  - Add methods to `IRequestsRepository` in `requestsRepository.ts` to update `telegram_snatch_message_id` on `download_requests` and `telegram_report_message_id` on `users`.
- **Report Card Service**:
  - Create a dedicated `ReportCardHandler` in `apps/telegram-bot/src/reportCardHandler.ts` (< 400 lines) responsible for rendering, posting, pinning, and updating the Report Card.
  - Expose internal API endpoints in `apps/api/src/routes/internal/telegram.ts` to retrieve formatted report summaries:
    - Active requests (`status in ['queued', 'downloading', 'hardlinking', 'unarchiving', 'seeding']`).
    - Recently completed requests (`status = 'done'`, sorted by `downloadedAt` descending, limit 3).
    - Active waitlist entries (`status in ['pending_release', 'checking', 'notified']`).
- **User Prompt & Ephemeral Cleanup**:
  - In `MessageHandler.handleMessage`, capture `msg.message_id`. After the bot sends the response (Carousel or direct reply), execute `await this.telegram.deleteMessage(chatId, msg.message_id)`.
  - In `CarouselHandler`, delete the carousel message when a candidate is selected before invoking `EpisodicHandler` or `SnatchHandler`.
  - In `EpisodicHandler`, delete the episodic selection message when an option is confirmed before invoking `SnatchHandler`.
  - In `SnatchHandler`, store the created confirmation card's `message_id` in `download_requests.telegram_snatch_message_id` via API.
- **Completion Hand-off in Notifier**:
  - In `TelegramNotifier.send('download.completed', ...)`:
    - Delete `telegram_snatch_message_id` from Telegram if present.
    - Send the "Download Concluído" notification message.
    - Trigger an asynchronous update of the user's pinned Report Card.
- **Line Count Constraints**:
  - Comply strictly with `no-monoliths.md` (< 400 lines for routes/services, < 500 lines for test files).

## Acceptance Criteria

- [ ] Sending a text command/query (e.g. `"Baixe o anime X"`) deletes the user's text message after the bot's card is sent.
- [ ] A pinned Report Card is automatically created on first user interaction and pinned at the top of the chat.
- [ ] The Report Card shows active downloads, up to 3 recent completed downloads, and active waitlist items.
- [ ] When empty, the Report Card displays an onboarding message prompting the user to make their first request.
- [ ] Clicking `[🔄 Atualizar]` on the Report Card updates its content in-place.
- [ ] Selecting a carousel item deletes the carousel message before showing the episodic menu.
- [ ] Selecting an episodic option deletes the episodic keyboard before showing snatch confirmation.
- [ ] When a download completes, the "Download Iniciado" message is deleted and replaced with "Download Concluído", and the Report Card updates in-place.
- [ ] Starting a new search request cleans up the previous completed/confirmation card.
- [ ] Container restarts do not break message cleanup (IDs persisted in DB).
- [ ] All unit and integration tests pass across `apps/api` and `apps/telegram-bot`.
