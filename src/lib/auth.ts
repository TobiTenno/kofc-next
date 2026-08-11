import type { BetterAuthOptions } from 'better-auth';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { authSchema, user } from '@/db/schema';
import { recordAuditEvent } from '@/lib/audit';
import { getAuthTrustedOrigins } from '@/lib/auth-trusted-origins';

const authOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: getAuthTrustedOrigins(),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    'development-secret-change-me-in-production-32chars',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username({
      minUsernameLength: 1,
      maxUsernameLength: 10,
      usernameNormalization: false,
      usernameValidator: (value) => /^\d+$/.test(value),
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: false,
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const accountUser = await db.query.user.findFirst({
            where: eq(user.id, session.userId),
          });
          const membershipNumber = accountUser?.username ?? null;
          await recordAuditEvent({
            actorMembershipNumber: membershipNumber,
            action: 'auth.login',
            summary: membershipNumber
              ? `Signed in as ${membershipNumber}`
              : 'Signed in',
            metadata: { userId: session.userId },
          });
        },
      },
    },
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authOptions,
  emailAndPassword: {
    ...authOptions.emailAndPassword,
    disableSignUp: true,
  },
});

/** Server-only signup (registration API + dev seed CLI). Public sign-up stays disabled on `auth`. */
export const serverSignUpAuth = betterAuth({
  ...authOptions,
  emailAndPassword: {
    ...authOptions.emailAndPassword,
    disableSignUp: false,
  },
});

export type Session = typeof auth.$Infer.Session;
