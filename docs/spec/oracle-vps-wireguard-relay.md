# Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec

## Problem Statement

The Media Download Manager currently relies on direct inbound port forwarding (ports 80 and 443) on the primary home router paired with a dynamic DNS updater container (`favonia/cloudflare-ddns`) to expose the Jellyfin media server (`watch.lalamovies.stream`).

This architecture creates three critical points of failure:
1. **CGNAT Ingress Block**: When the primary ISP fails or the system switches to a backup connection (such as Conectiva Telecom), the connection is trapped behind Carrier-Grade NAT (CGNAT) and ports 80/443 are reserved by the ISP's router firmware, completely breaking external media playback.
2. **Cloudflare Terms of Service Airgap**: Routing high-bandwidth video streams through free Cloudflare Tunnels or Cloudflare CDN proxying violates Cloudflare Section 2.8 of the Self-Serve Subscription Agreement, risking domain-level suspension.
3. **Fragile Dynamic DNS**: Home IP rotations cause temporary playback dropouts while DNS TTLs propagate across client devices.

---

## Solution

Deploy an Always Free **Oracle Cloud Infrastructure (OCI) WireGuard & Caddy Relay** that acts as a dedicated, static public ingress point for Jellyfin:

1. **VPS Ingress Relay**:
   - An Always Free Oracle Linux VM (`167.126.3.136`) provides a static, permanent public IPv4 address with unrestricted access to ports 80 and 443.
   - The VPS runs **WireGuard** as a peer server and **Caddy** as a TLS reverse proxy.
   - Caddy on the VPS obtains and auto-renews Let's Encrypt certificates for `watch.lalamovies.stream` via HTTP-01 challenges directly on ports 80/443.

2. **Outbound Encrypted Tunnel**:
   - The home Docker environment establishes an outbound WireGuard connection from home to the Oracle VPS (`167.126.3.136:51820/udp`).
   - Because the tunnel initiates outbound from the home server, it bypasses all home router firewalls, traverses CGNAT completely, and remains operational regardless of which ISP (TIM, Conectiva, or mobile hotspot) is active.
   - If the home connection switches ISPs, WireGuard's endpoint roaming automatically re-establishes the tunnel in seconds without dropping client sessions.

3. **Reverse Proxy Routing**:
   - Inbound requests to `https://watch.lalamovies.stream` hit Caddy on the VPS, terminate TLS, and reverse-proxy across the WireGuard tunnel (`10.13.13.2:8096`) to the local Jellyfin container.
   - Zero video streaming traffic passes through Cloudflare proxies, guaranteeing 100% compliance with Cloudflare ToS.

4. **Container Decommissioning**:
   - Decommission `mdm-ddns` from home `docker-compose.yml` (the VPS IP is permanently static).
   - Decommission `mdm-caddy` from the home Docker stack (ports 80 and 443 are freed on all home routers).
   - Add a lightweight `mdm-wireguard` client container on the home stack attached to the internal network.

---

## User Stories

### Reliability & ISP Agnostic Streaming
1. As a user streaming media on Jellyfin, I want playback to remain uninterrupted when my home network switches from my primary ISP to my backup ISP, so that network failovers are seamless.
2. As a system operator whose backup ISP uses CGNAT, I want external connections to bypass CGNAT without paying monthly ISP fees for static IPs, so that my infrastructure is cost-effective.
3. As a system operator, I want ports 80 and 443 to remain completely closed on my home routers, so that my home network has zero exposed inbound ports.
4. As a media server user, I want the Jellyfin address (`https://watch.lalamovies.stream`) to use the standard HTTPS port 443, so that I never have to append non-standard port numbers (like `:8443` or `:8096`).

### Cloudflare Compliance & Security
5. As an administrator, I want video streaming traffic routed directly through the VPS without passing through Cloudflare CDN or Tunnels, so that my domain is completely safe from Cloudflare ToS section 2.8 violations.
6. As an administrator, I want Caddy on the VPS to automatically manage Let's Encrypt certificates, so that SSL/TLS certificates renew without manual intervention.
7. As an administrator, I want the WireGuard connection between the VPS and my home server encrypted with modern ChaCha20-Poly1305 cryptography, so that inter-server traffic is secure.

### Infrastructure Cleanliness
8. As a developer, I want `mdm-ddns` removed from the home stack, so that unnecessary background DNS polling jobs are eliminated.
9. As a developer, I want `mdm-caddy` removed from the home stack, so that port conflicts on the home server are eliminated.

---

## Implementation Decisions

### 1. Oracle VPS Configuration (`167.126.3.136`)
- **OS**: Oracle Linux 9 (`x86_64`, `VM.Standard.E2.1.Micro`, Always Free).
- **Firewall & Security**:
  - Configure `firewalld` on the VPS to permit:
    - `ssh` (port 22/tcp)
    - `http` (port 80/tcp)
    - `https` (port 443/tcp)
    - `wireguard` (port 51820/udp)
  - Ensure OCI VCN Ingress Rules allow TCP 80, 443 and UDP 51820 from `0.0.0.0/0`.
- **Relay Services**:
  - Run containerized or systemd-managed **WireGuard**:
    - Subnet: `10.13.13.0/24`
    - VPS IP: `10.13.13.1`
    - Home Client IP: `10.13.13.2`
  - Run containerized or systemd-managed **Caddy**:
    - Reverse proxy configuration:
      ```caddy
      watch.lalamovies.stream {
          reverse_proxy 10.13.13.2:8096 {
              header_up X-Real-IP {remote_host}
              header_up X-Forwarded-For {remote_host}
              header_up X-Forwarded-Proto https
          }
      }
      ```

### 2. Home Stack Modifications (`docker/docker-compose.yml`)
- **Decommission Services**:
  - Remove `caddy` service definition, ports `80:80` and `443:443`, and associated volumes (`caddy_data`, `caddy_config`).
  - Remove `ddns` service definition (`favonia/cloudflare-ddns`).
- **Add WireGuard Client Service**:
  - Add `wireguard` service using image `linuxserver/wireguard:latest`:
    - Cap add: `NET_ADMIN`, `SYS_MODULE`
    - Config volume mounting client keys and `wg0.conf`
    - Connected to the `mdm` bridge network
    - Sets keepalive interval (`PersistentKeepalive = 25`) to preserve stateful NAT hole punching through CGNAT gateways.
- **Jellyfin Service**:
  - Remains on internal port 8096, reachable by the WireGuard client container over the Docker network or host network.

### 3. DNS Configuration (Cloudflare)
- Update Cloudflare DNS A record:
  - Name: `watch.lalamovies.stream`
  - Value: `167.126.3.136`
  - Proxy status: **DNS only** (`PROXIED=false` / Grey Cloud) to ensure video traffic streams direct to the VPS and bypasses Cloudflare CDN.

---

## Testing Decisions

### Good Test Principles
- Test observable network connectivity and end-to-end HTTPS/video streaming delivery.
- Verify automatic tunnel reconnection across network toggles.

### Test Coverage Plan
1. **Network Connectivity & Handshake Verification**:
   - Verify WireGuard handshake between Home Docker client (`10.13.13.2`) and Oracle VPS (`10.13.13.1`).
   - Bidirectional ping test: `ping 10.13.13.1` from home, `ping 10.13.13.2` from VPS.
2. **Caddy TLS Termination & Reverse Proxy**:
   - Verify Caddy on VPS successfully issues Let's Encrypt certificate for `watch.lalamovies.stream`.
   - Query `curl -I https://watch.lalamovies.stream/System/Info/Public` from external network, expecting HTTP 200 from Jellyfin.
3. **End-to-End Media Playback**:
   - Play a video stream on Jellyfin via `https://watch.lalamovies.stream` in a browser and verify smooth direct playback without buffering.
4. **CGNAT / ISP Switch Simulation**:
   - Disconnect primary network or simulate endpoint change to verify WireGuard roaming maintains playback without requiring DNS propagation.

---

## Out of Scope
- Migrating the MDM API, Watcher, or Downloader containers to the VPS (all remain on home server).
- Relaying torrent peer-to-peer download traffic through the VPS (qBittorrent continues downloading directly on the home host).
- Storing media files on Oracle Cloud block storage (media stays on local disk array).

---

## Further Notes
- Oracle Cloud Free Tier provides **10 TB per month of outbound bandwidth**, which accommodates over 2,500 hours of 1080p video streaming at 8 Mbps.
