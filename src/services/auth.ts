import { eq } from 'drizzle-orm';
import { authors } from '../db/schema';
import { db } from '../db';
import { Role, ROLES } from '../config/auth';

export class AuthService {
  static async validateAuthor(email: string): Promise<{
    id: number;
    email: string;
    role: Role;
  } | null> {
    const result = await db
      .select({
        id: authors.id,
        email: authors.email,
        role: authors.role,
      })
      .from(authors)
      .where(eq(authors.email, email))
      .limit(1);

    return result[0] || null;
  }

  static generateHasuraClaims(id: number, role: Role) {
    const allowedRoles = role === ROLES.ADMIN
      ? [ROLES.ADMIN, ROLES.AUTHOR, ROLES.PUBLIC]
      : [ROLES.AUTHOR, ROLES.PUBLIC];

    return {
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': allowedRoles,
        'x-hasura-default-role': role,
        'x-hasura-user-id': id.toString(),
        'x-hasura-role': role,
      }
    };
  }
}

