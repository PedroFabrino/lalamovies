import { FastifyPluginAsync } from 'fastify';
import { RequestServiceError } from '../../services/requestServiceTypes';
import { replaceTorrentSchema } from './schemas';

export const replaceTorrentRoutes: FastifyPluginAsync = async (app) => {
  // POST /requests/:id/replace-torrent — replace underway torrent
  app.post('/:id/replace-torrent', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.currentUser;
    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const parseResult = replaceTorrentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    try {
      const result = await app.requestService.replaceTorrent({
        requestId: id,
        userId: user.id,
        userRole: user.role,
        ...parseResult.data,
      });

      return reply.send(result);
    } catch (err) {
      if (err instanceof RequestServiceError) {
        return reply.status(err.statusCode).send({
          error: err.error,
          message: err.message,
        });
      }
      throw err;
    }
  });
};
