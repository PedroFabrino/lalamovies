# 0030. Telegram Pinned Report and Ephemeral Interaction Flow

We introduced a pinned persistent Report Card in Telegram paired with an ephemeral interactive workspace that automatically cleans user prompts, carousel cards, and intermediate step messages.

## Context & Decision

In interactive messaging bots, chat histories quickly become cluttered with intermediate prompts, search carousels, option selection keyboards, and confirmation messages. When multiple downloads are in-flight, a single ephemeral card cannot convey background status without losing user context or accumulating historical noise. Furthermore, users typing requests in chat expect immediate responsiveness without leaving orphaned command text.

We decided to:
1. **Pinned Report Card**: Maintain a dedicated summary message pinned at the top of the user's private Telegram chat (`pinChatMessage` with silent notification). The Report Card displays all active in-progress downloads (`⏳`), up to 3 recently completed downloads (`✅`, prioritized down if active downloads saturate message limits), active Waitlist items (`📋`), or an onboarding prompt when empty. An inline `[🔄 Atualizar]` button enables manual in-place refresh.
2. **Ephemeral Interaction Flow**: Constrain interactive request intake (search carousel, season/episode choice, snatch confirmation) to a single temporary workspace message below the Report Card. Each step either replaces or deletes the preceding message.
3. **User Prompt Cleanup**: Delete incoming user command and search messages immediately after the bot's initial response card is successfully delivered, ensuring no command clutter remains while guaranteeing visual feedback during transit.
4. **Lifecycle Notification Hand-off**: When a download completes or fails, delete the ephemeral "Download Started" card, post a new "Download Completed" card (triggering a native push notification with a direct Jellyfin deep link), and update the pinned Report Card in-place.
5. **Persistence of Message Identifiers**: Store `telegram_report_message_id` on the `users` table and `telegram_snatch_message_id` on the `download_requests` table so that asynchronous lifecycle transitions (completion, failure, retries) can reliably update the Report Card and clean up initiation cards across service restarts.
