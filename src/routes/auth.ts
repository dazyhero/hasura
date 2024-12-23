import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth';

interface LoginInput {
  email: string;
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: LoginInput }>('/login', async (request, reply) => {
    const { email } = request.body;

    try {
      const author = await AuthService.validateAuthor(email);

      if (!author) {
        return reply.status(401).send({
          message: 'Invalid credentials'
        });
      }

      const claims = AuthService.generateHasuraClaims(author.id, author.role);

      const token = await reply.jwtSign({
        id: author.id,
        email: author.email,
        role: author.role,
        ...claims
      });

      return { token };
    } catch (error) {
      request.log.error(error);
      return reply.status(401).send({
        message: 'Authentication failed'
      });
    }
  });

  // Protected route example
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      return {
        user: request.user
      };
    }
  });
}

