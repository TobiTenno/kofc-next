import type { BetterAuthOptions } from 'better-auth';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, username } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { authSchema, user } from '@/db/schema';
import { recordAuditEvent } from '@/lib/audit';
import { getAuthTrustedOrigins } from '@/lib/auth-trusted-origins';

const authOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: authSchema,
  }),
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // Impersonation creates a session too — skip login noise.
          if (session.impersonatedBy) {
            return;
          }
          const accountUser = await db.query.user.findFirst({
            where: eq(user.id, session.userId),
          });
          const membershipNumber = accountUser?.username ?? null;
          await recordAuditEvent({
            action: 'auth.login',
            actorMembershipNumber: membershipNumber,
            metadata: { userId: session.userId },
            summary: membershipNumber
              ? `Signed in as ${membershipNumber}`
              : 'Signed in',
          });
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username({
      maxUsernameLength: 10,
      minUsernameLength: 1,
      usernameNormalization: false,
      usernameValidator: value => /^\d+$/.test(value),
    }),
    admin({
      adminRoles: ['admin'],
      defaultRole: 'user',
      // Troubleshooting windows; webmaster can re-impersonate if needed.
      impersonationSessionDuration: 60 * 60 * 4,
    }),
  ],
  secret:
    process.env.BETTER_AUTH_SECRET
    ?? 'development-secret-change-me-in-production-32chars',
  session: {
    cookieCache: {
      enabled: false,
    },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: getAuthTrustedOrigins(),
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
  emailAndPassword: {
    ...authOptions.emailAndPassword,
    disableSignUp: true,
  },
});

/**
Server-only signup (registration API + dev seed CLI). Public sign-up stays disabled on `auth`.
*/
export const serverSignUpAuth = betterAuth({
  ...authOptions,
  emailAndPassword: {
    ...authOptions.emailAndPassword,
    disableSignUp: false,
  },
});

export type Session = typeof auth.$Infer.Session;
