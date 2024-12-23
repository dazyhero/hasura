import { FastifyPluginAsync } from 'fastify';

const uploadTestRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/upload', async (request, reply) => {
    return reply.sendFile('upload-test.html');
  });
};

export default uploadTestRoutes;

