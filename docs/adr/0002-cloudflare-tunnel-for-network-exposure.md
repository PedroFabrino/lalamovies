# Cloudflare Tunnel for Network Exposure

The Fastify backend runs inside Docker on a local machine (or home server). Rather than port-forwarding a home router port or provisioning a VPS, we use a Cloudflare Tunnel (``cloudflared`` Docker container) to expose the backend via a stable HTTPS URL with no inbound firewall rules and no static IP dependency. The Vue frontend is deployed to Vercel and communicates with the backend exclusively through this tunnel URL.

## Considered Options

- **Router port forwarding** — rejected: exposes a home IP directly, breaks when the ISP assigns a new IP, requires DDNS, and is a meaningful attack surface.
- **VPS reverse proxy** — valid but adds ~4 EUR/month cost and an additional machine to maintain for what is essentially a proxy hop.
- **Tailscale** — rejected for this role: requires every friend to install the Tailscale client before they can use the web app, which is too high a barrier for casual users.

## Consequences

- The deployment depends on Cloudflare''s free tier remaining free. If Cloudflare changes pricing, the fallback is a cheap VPS proxy.
- All traffic transits Cloudflare''s network. Acceptable given content is non-sensitive (download requests, not the media files themselves).
- The tunnel URL must be kept out of public repositories (treat as a secret / environment variable).
