import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { ROLES, Role } from '../config/auth';

interface HasuraActionHeaders {
  'x-hasura-admin-secret'?: string;
}

interface HasuraActionError {
  message: string;
  extensions?: {
    code: string;
    path?: string;
  };
}

export async function validateHasuraAction(
  request: FastifyRequest<RouteGenericInterface>,
  reply: FastifyReply
): Promise<void> {
  try {
    const adminSecret = (request.headers as HasuraActionHeaders)['x-hasura-admin-secret'];
    if (adminSecret === process.env.HASURA_GRAPHQL_ADMIN_SECRET) {
      return;
    }

    await request.jwtVerify();
    const user = request.user;

    if (!user || !user['https://hasura.io/jwt/claims']) {
      const error: HasuraActionError = {
        message: 'Invalid token structure',
        extensions: {
          code: 'INVALID_JWT_STRUCTURE'
        }
      };
      reply.status(401).send(error);
      return;
    }

    const claims = user['https://hasura.io/jwt/claims'];
    const userRole = claims['x-hasura-role'] as Role;
    const userId = claims['x-hasura-user-id'];

    if (!Object.values(ROLES).includes(userRole)) {
      const error: HasuraActionError = {
        message: 'Invalid user role',
        extensions: {
          code: 'INVALID_ROLE'
        }
      };
      reply.status(403).send(error);
      return;
    }

    if (userRole !== ROLES.ADMIN) {
      const requestPath = request.routeOptions?.url ?? request.url;

      if (requestPath?.includes('/pictures')) {
        const pictureData = request.body as any;
        if (pictureData?.collection_id) {
          // You might want to verify if the user has access to this collection
          // This would require a database check against collection_authors
          // Implementation depends on your specific requirements
        }
      }

      if (requestPath?.includes('/collections')) {
        const collectionData = request.body as any;
        if (collectionData?.id || collectionData?.collection_id) {
        }
      }

      if (requestPath?.includes('/admin')) {
        const error: HasuraActionError = {
          message: 'Unauthorized access',
          extensions: {
            code: 'UNAUTHORIZED',
            path: requestPath
          }
        };
        reply.status(403).send(error);
        return;
      }
    }

    request.requestContext = {
      ...request.requestContext,
      userId: parseInt(userId),
      userRole: userRole,
    };

  } catch (error) {
    const hasuraError: HasuraActionError = {
      message: error instanceof Error ? error.message : 'Authentication failed',
      extensions: {
        code: 'AUTHENTICATION_FAILED'
      }
    };
    reply.status(401).send(hasuraError);
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    requestContext?: {
      userId: number;
      userRole: Role;
    };
  }
}

