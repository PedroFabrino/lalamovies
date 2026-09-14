import { FastifyRequest, FastifyReply } from 'fastify';

export function hasPasskey(urlOrMagnet: string): boolean {
  if (!urlOrMagnet) return false;
  try {
    const decoded = decodeURIComponent(urlOrMagnet);
    const patterns = [
      /[?&](passkey|authkey|torrent_pass|auth|key|uk)=[a-zA-Z0-9]+/i,
      /\/announce\/[a-zA-Z0-9]{16,}/i,
      /[a-zA-Z0-9]{16,}\/announce/i,
      /announce\?.*?(passkey|authkey)/i,
    ];
    return patterns.some((p) => p.test(decoded));
  } catch {
    return false;
  }
}

export async function assertPublicTracker(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as {
    isPrivateTracker?: boolean;
    magnetLink?: string;
    downloadUrl?: string;
  } | null;

  if (!body || typeof body !== 'object') {
    return;
  }

  if (body.isPrivateTracker === true) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Releases from private trackers cannot be streamed via cloud debrid',
    });
  }

  const magnetOrUrl = body.magnetLink || body.downloadUrl;
  if (magnetOrUrl && hasPasskey(magnetOrUrl)) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Private tracker announce passkey detected. Streaming barred to prevent security leaks',
    });
  }
}
