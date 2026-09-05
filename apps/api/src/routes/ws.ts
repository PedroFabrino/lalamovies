import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { WebSocket } from 'ws';
import { eq } from 'drizzle-orm';
import { downloadRequests } from '../db/schema';

export type BroadcastFunction = (message: object) => void;

declare module 'fastify' {
  interface FastifyInstance {
    broadcast: BroadcastFunction;
  }
}

const wsRoutesPlugin: FastifyPluginAsync = async (app) => {
  const clients = new Set<WebSocket>();

  const broadcast: BroadcastFunction = (message: object) => {
    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  app.decorate('broadcast', broadcast);

  // Every 2 seconds, broadcast progress for actively downloading requests
  const progressTimer = setInterval(async () => {
    if (clients.size === 0) return;

    try {
      const activeDownloads = app.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.status, 'downloading'))
        .all();

      for (const req of activeDownloads) {
        if (!req.qbTorrentHash) continue;
        const status = await app.qbittorrent.getTorrentStatus(req.qbTorrentHash);
        if (status) {
          broadcast({
            type: 'progress',
            requestId: req.id,
            progress: status.progress,
            speedBps: status.dlspeed,
            etaSeconds: status.eta,
          });
        }
      }
    } catch (err) {
      app.log.error(err, 'Error broadcasting torrent progress');
    }
  }, 2000);

  app.addHook('onClose', async () => {
    clearInterval(progressTimer);
    for (const client of clients) {
      client.close();
    }
    clients.clear();
  });

  app.get('/ws', { websocket: true }, (socket, req) => {
    // 1. Verify Origin header if provided
    const rawAllowed = process.env.FRONTEND_URL || 'http://localhost:5173';
    const allowedOrigins = rawAllowed.split(',').map((o) => o.trim());
    const origin = req.headers.origin;

    if (origin) {
      const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
      const isAllowedDomain =
        origin.endsWith('lalamovies.stream') ||
        origin.includes('.lalamovies.stream') ||
        origin.endsWith('vercel.app') ||
        origin.includes('.vercel.app');
      const isCustomAllowed = allowedOrigins.some((allowed) => allowed && origin === allowed);

      if (!isLocal && !isAllowedDomain && !isCustomAllowed) {
        req.log.warn({ origin, rawAllowed }, 'WebSocket rejected: forbidden origin');
        socket.close(4403, 'Forbidden origin');
        return;
      }
    }

    // 2. Extract and verify JWT
    let token = req.cookies?.token;
    if (!token && typeof req.query === 'object' && req.query !== null) {
      token = (req.query as Record<string, string>).token;
    }

    if (!token) {
      req.log.warn({ origin }, 'WebSocket rejected: missing token');
      socket.close(4401, 'Unauthorized');
      return;
    }

    try {
      app.jwt.verify(token);
    } catch (err) {
      req.log.warn({ origin, err }, 'WebSocket rejected: invalid token');
      socket.close(4401, 'Unauthorized');
      return;
    }

    req.log.info({ origin }, 'WebSocket client connected');
    clients.add(socket);

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
    });
  });
};
export const wsRoutes = fp(wsRoutesPlugin, { name: 'wsRoutes' });
