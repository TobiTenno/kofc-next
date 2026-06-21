import type { BetterAuthOptions } from 'better-auth';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { db } from '@/db';
import { authSchema } from '@/db/schema';
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
