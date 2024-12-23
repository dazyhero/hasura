import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import fjwt from '@fastify/jwt';
import { hasuraActionRoutes } from './routes/hasura/actions';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'path';

import { authRoutes } from './routes/auth';
import { JWT_CONFIG } from './config/auth';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

export async function buildServer(): Promise<FastifyInstance> {

  const server: FastifyInstance = fastify({
    logger: true
  });

  await server.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-hasura-admin-secret']
  });

  await server.register(fjwt, {
    secret: JWT_CONFIG.SECRET
  });

  server.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: err instanceof Error ? err.message : 'Authentication failed'
        });
      }
    }
  );



  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(hasuraActionRoutes, { prefix: '/hasura/actions' });
  await server.register(fastifyMultipart);
  await server.register(import('./routes/test/upload'), { prefix: '/test' });

  await server.register(fastifyStatic, {
    root: join(__dirname, '../public'),
    prefix: '/public/',
  });


  return server;
}
