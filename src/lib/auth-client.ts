'use client';

import { adminClient, usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window === 'undefined' ? undefined : location.origin,
  plugins: [usernameClient(), adminClient()],
});
