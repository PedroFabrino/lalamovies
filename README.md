# Media Download Manager (MDM)

A self-hosted media download and automation platform designed for small, trusted groups of friends. Users submit magnet links via a web dashboard, the backend downloads torrents with qBittorrent, enriches metadata from TMDB and AniList, automatically hardlinks files to Jellyfin-compliant directory structures, and serves media through Jellyfin. Storage is automatically reclaimed using a play-history-aware least-recently-used (LRU) cleanup policy with 24-hour advance Discord warnings.

---

## System Architecture

```
[Vue 3 + Vite SPA (Vercel)]
          ↕ HTTPS (REST + WebSocket)
  [Cloudflare Tunnel]
          ↕
[Fastify API + SQLite (Docker)]  ←→  [qBittorrent (Docker)]
          ↕                                  ↕
   [Jellyfin API]               [/media_data/downloads/staging]
          ↕                                  ↕ hardlink upon completion
          └──────── /media_data/media/movies|shows|anime ────────┘
```

- **Shared Volume**: All storage (`/media_data/downloads/staging`, `/media_data/media`, `/media_data/data`) resides on a single Docker named volume (`media_data`), ensuring atomic filesystem hardlinks without data duplication.
- **Identity Provider**: Jellyfin serves as the single source of truth for authentication.
- **Cleanup**: Proactive disk space checks (< 15% reject threshold, < 20% nightly warning threshold) and play-history LRU cleanup with admin keep-flag immunity.

---

## Prerequisites

Before starting, ensure you have the following installed and set up:

1. **Docker Engine & Docker Compose** (v20.10+ / Compose v2+)
2. **Node.js & pnpm** (Node v20+, pnpm v9+)
3. **Cloudflare Account** (Free tier) — for exposing the backend API securely via Cloudflare Tunnel
4. **TMDB API Key** (Free) — create an account at [themoviedb.org](https://www.themoviedb.org/) and generate an API key under Settings > API
5. **Discord Server** — with an incoming webhook URL for download and cleanup notifications

---

## Quick Start

### 1. Clone and Configure Environment

```bash
git clone <repo-url>
cd Plex-auto-download
cp .env.example .env
```

Edit `.env` and fill in your secrets and API keys:

```ini
# Core Secrets
JWT_SECRET=generate-a-strong-random-secret-here
TMDB_API_KEY=your_tmdb_api_key
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=your_cloudflare_tunnel_token
```

### 2. Launch Local Docker Stack

Start the backend API, qBittorrent, and Jellyfin services:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Check running containers:

```bash
docker compose -f docker/docker-compose.yml ps
```

---

## First-Run Setup Guide

Follow these numbered steps to configure your instance on first boot:

### Step 1: Jellyfin Initial Wizard & Library Setup
1. Open your browser and navigate to **`http://localhost:8096`**.
2. Follow the on-screen Jellyfin setup wizard to create your primary administrator account (e.g., username `admin`).
3. Add three media libraries mapped to the shared container paths:
   - **Movies**: Content type `Movies` → Folder path `/media_data/media/movies`
   - **Shows**: Content type `Shows` → Folder path `/media_data/media/shows`
   - **Anime**: Content type `Shows` or `Mixed` → Folder path `/media_data/media/anime`
4. Complete the wizard and log into the Jellyfin dashboard.

### Step 2: Generate Jellyfin API Key
1. In Jellyfin, click the hamburger menu (top left) → **Dashboard** → **API Keys** (under *Advanced*).
2. Click the **+** button to create a new key named `Media Download Manager`.
3. Copy the generated token into your `.env` file:
   ```ini
   JELLYFIN_API_KEY=your_copied_api_key_here
   ```
4. Restart the API container to pick up the key:
   ```bash
   docker compose -f docker/docker-compose.yml restart api
   ```

### Step 3: Verify Backend Health
Confirm the Fastify backend is up and running by visiting:
```bash
curl http://localhost:3000/health
# Response: {"status":"ok","timestamp":"...","uptime":...}
```

### Step 4: First Admin Login
1. Start the web frontend locally or deploy to Vercel (see [Frontend Deployment](#frontend-deployment)).
2. Navigate to the login page (`/login`).
3. Log in using your **Jellyfin administrator username and password**.
4. The system detects this is the first user in the database and automatically promotes you to **Admin** role!

---

## Cloudflare Tunnel Setup

To allow the frontend on Vercel to communicate with your self-hosted backend without opening public router ports:

1. Log into the [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Navigate to **Networks** → **Tunnels** → **Create a Tunnel**.
3. Choose **Cloudflared** and name your tunnel (e.g., `mdm-tunnel`).
4. Under **Install and run a connector**, select **Docker** and copy the tunnel token (the string after `--token`).
5. Paste this token into `.env`:
   ```ini
   CLOUDFLARE_TUNNEL_TOKEN=your_token_value_here
   ```
6. In the Cloudflare Tunnel configuration, add a **Public Hostname**:
   - **Subdomain / Domain**: e.g., `api.yourdomain.com`
   - **Type**: `HTTP`
   - **URL**: `api:3000` (resolves internally via Docker network)
7. Start or restart the `cloudflared` container:
   ```bash
   docker compose -f docker/docker-compose.yml up -d cloudflared
   ```

---

## Frontend Deployment (Vercel)

The web frontend is a Vue 3 + Vite SPA located in `apps/web`.

### Deploying via Vercel CLI

```bash
# 1. Enter web workspace
cd apps/web

# 2. Install dependencies & build
pnpm install
pnpm build

# 3. Deploy with Vercel
vercel
```

### Environment Variables on Vercel

In your Vercel Project Settings under **Environment Variables**, set:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Public HTTPS URL of your Cloudflare Tunnel | `https://api.yourdomain.com` |

Vercel automatically handles client-side SPA routing via `apps/web/vercel.json`.

---

## Inviting Friends

The application includes an invite system that provisionally links new users directly to Jellyfin without requiring you to share Jellyfin admin credentials:

1. Log in to the dashboard as an Admin.
2. Navigate to **Admin** (`/admin`) in the top navigation bar.
3. On the **Users & Invites** tab, click **Invite Friend**.
4. Choose the invite expiration window (12h, 24h, 48h, or 7 days).
5. Click **Generate Invite Link** and click **Copy Link**.
6. Send the generated link (`https://your-domain.vercel.app/invite/<token>`) to your friend.
7. When your friend opens the link, they choose their username and password. The backend atomically creates their account on Jellyfin and registers them in the app database!

---

## Environment Variable Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `3000` | Port for the Fastify backend HTTP/WS server |
| `HOST` | No | `0.0.0.0` | Bind address for Fastify |
| `NODE_ENV` | No | `development` | Application environment (`development` / `production`) |
| `JWT_SECRET` | **Yes** | — | Cryptographic secret for signing session JWT tokens |
| `DATABASE_PATH` | No | `/media_data/data/app.db` | File path to the SQLite database file |
| `STAGING_PATH` | No | `/media_data/downloads/staging` | Staging Area directory where torrents download |
| `MEDIA_PATH` | No | `/media_data/media` | Root directory for hardlinked Jellyfin media libraries |
| `JELLYFIN_URL` | **Yes** | `http://jellyfin:8096` | Internal HTTP address of the Jellyfin server |
| `JELLYFIN_API_KEY` | **Yes** | — | Admin API key generated in Jellyfin Dashboard |
| `QBITTORRENT_URL` | No | `http://qbittorrent:8080` | Internal HTTP address of the qBittorrent Web UI |
| `QBITTORRENT_USER` | No | `admin` | qBittorrent Web UI username |
| `QBITTORRENT_PASSWORD`| No | `adminadmin` | qBittorrent Web UI password |
| `TMDB_API_KEY` | **Yes** | — | Developer API Key from The Movie Database (v3 auth) |
| `DISCORD_WEBHOOK_URL`| No | — | Discord Webhook URL for download and cleanup alerts |
| `RESEND_API_KEY` | No | — | Resend API key (stubbed for future email notifications) |
| `CLOUDFLARE_TUNNEL_TOKEN` | No | — | Connector token from Cloudflare Zero Trust dashboard |
| `VITE_API_URL` | **Yes** | `http://localhost:3000` | Public backend URL configured in the frontend SPA |

---

## Development & Testing

Run commands from the monorepo root:

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm --filter @mdm/api db:migrate

# Run all backend unit & integration tests
pnpm --filter @mdm/api test

# Typecheck backend and frontend
pnpm typecheck

# Lint all packages
pnpm lint

# Build frontend for production
pnpm --filter @mdm/web build
```

---

## License

MIT
