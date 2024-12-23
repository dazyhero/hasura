import { JWT } from '@fastify/jwt';

export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
};

export const ROLES = {
  ADMIN: 'admin',
  AUTHOR: 'author',
  PUBLIC: 'public'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: number;
      email: string;
      role: Role;
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': Role[];
        'x-hasura-default-role': Role;
        'x-hasura-user-id': string;
        'x-hasura-role': Role;
      };
    }
  }
}
