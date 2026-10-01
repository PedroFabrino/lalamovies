# ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure

- **Status**: Accepted
- **Date**: 2026-10-01

## Context

The system previously exposed the Jellyfin media server (`watch.lalamovies.stream`) via inbound port forwarding (ports 80 and 443) on the primary home router, using Caddy for Let's Encrypt TLS termination and a dynamic DNS updater container (`favonia/cloudflare-ddns`) pointing to the home public IP.

This approach failed when integrating a secondary backup ISP (Conectiva Telecom):
1. **Carrier-Grade NAT (CGNAT)**: The backup connection operates behind CGNAT, sharing public IPs upstream and rendering local router port forwarding ineffective without paying recurring ISP fees (~R$ 47.50/month) for a dedicated IP.
2. **Management Port Conflicts**: The ISP's router firmware reserves ports 80 and 443 for its remote administration panel, preventing standard HTTP/HTTPS forwarding even if 1:1 NAT is attempted.
3. **Cloudflare Terms of Service (Section 2.8)**: Video streaming cannot be routed through Cloudflare Tunnel or Cloudflare CDN proxying (`PROXIED=true`) on free plans, as Cloudflare strictly prohibits high-bandwidth media caching and streaming, risking domain suspension.

## Decision

Deploy an Always Free **Oracle Cloud Infrastructure (OCI) WireGuard & Caddy Relay** (`167.126.3.136`) to serve as a permanent, static public ingress point for Jellyfin:

1. **VPS Ingress**:
   - The Oracle VPS provides a permanent static public IP with unrestricted access to ports 80 and 443.
   - Caddy runs on the VPS, handling public HTTPS termination for `watch.lalamovies.stream` via Let's Encrypt.
   - Cloudflare DNS for `watch.lalamovies.stream` points directly to the VPS IP (`167.126.3.136`) with `PROXIED=false` (DNS-only), ensuring 100% compliance with Cloudflare ToS.

2. **Outbound Encrypted Tunnel**:
   - The home Docker environment initiates an outbound WireGuard connection to the VPS (`167.126.3.136:51820/udp`).
   - Outbound tunneling bypasses home router firewalls and traverses CGNAT transparently.
   - If the home connection fails over between ISPs (TIM $\leftrightarrow$ Conectiva), WireGuard roaming maintains the connection without requiring DNS updates or client reconnections.

3. **Decommissioning Home Ingress**:
   - Decommission `mdm-ddns` (home IP tracking is no longer needed).
   - Decommission `mdm-caddy` from the home Docker stack, freeing ports 80 and 443 on all home routers.
   - Add a lightweight `wireguard` client container to the home Docker stack.

## Consequences

**Good**:
- Full immunity to CGNAT, router management port conflicts, and home IP rotations.
- Zero open inbound ports required on any home router.
- Instant, seamless ISP failover for media streaming.
- Complete compliance with Cloudflare Terms of Service (video streams never transit Cloudflare proxies).
- Zero recurring cost (runs within Oracle Cloud Always Free tier with 10 TB/month outbound bandwidth).

**Trade-offs & Mitigations**:
- Video streaming traffic routes through the VPS; mitigated by hosting the VM in the local São Paulo region (Brazil East) with low latency (~10–15ms) and ample 10 TB/month free egress capacity.
