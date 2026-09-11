import { FastifyRequest, FastifyReply } from 'fastify';

export async function serviceKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const serviceKey = request.server.serviceApiKey;
  const headerKey = request.headers['x-service-key'];
  const providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;

  if (!serviceKey || !providedKey || providedKey !== serviceKey) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing X-Service-Key',
    });
  }
}
