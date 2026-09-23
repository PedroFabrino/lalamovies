# Torrent Replacement for Underway Requests

We allow primary requesters and Admins to perform an in-place Torrent Replacement on active or stalled Download Requests (states `downloading`, `queued`, or `error`), substituting the underlying torrent or magnet link while preserving the request identity, Metadata Match, and co-requesters. The previous torrent and uncompleted staging files are cleanly purged from qBittorrent, and the request transitions into downloading or queued with reset download metrics.

## Considered Options

- **Delete and Re-request** — rejected because it forces users to re-search metadata, drops established co-requester linkages, resets request IDs, and risks confusion over duplicate entries or missing history.
- **In-place File/Piece Reuse (Hash Recheck)** — rejected because torrents from different release groups or trackers almost never share identical file structures or chunk boundaries; attempting partial reuse risks file corruption and lingering orphaned staging artifacts.
- **Co-Requester Edit Rights** — rejected in favor of restricting replacement authorization strictly to the Primary Requester and Admins, avoiding race conditions or conflicting torrent swaps between concurrent viewers.
- **Prowlarr Search for Private Media** — rejected to strictly preserve the Private Tracker Airgap; private requests are constrained to manual magnet or .torrent file uploads.

## Consequences

- A new dedicated API endpoint `POST /requests/:id/replace-torrent` validates caller permissions (Primary Requester or Admin) and enforces that request status is `downloading`, `queued`, or `error`.
- For `downloading` requests, qBittorrent purges the existing torrent and staging data (`removeTorrent(hash, deleteFiles=true)`), submits the new torrent, and keeps the request in `downloading` with reset progress.
- For `queued` requests, existing staged files are purged, and the request remains queued with the new payload staged until a concurrency slot or quota space frees up.
- For `error` requests, old failure states and hashes are cleaned up, transitioning to `downloading` if a slot is available or `queued` otherwise.
- The Dashboard table renders a "Replace Torrent" action button for eligible requests, opening a modal that auto-fetches Prowlarr `Release Candidates` for public media with 1-click selection and provides a manual magnet/file tab. Private media requests default strictly to manual input.
- External notifications (Discord/email) remain silent to avoid spam, while live WebSocket updates inform active web clients.
