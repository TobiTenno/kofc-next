'use client';

import { authClient } from '@/lib/auth-client';

const postSignOut = async (): Promise<boolean> => {
  const response = await fetch('/api/auth/sign-out', {
    body: '{}',
    cache: 'no-store',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  return response.ok;
};

export const signOutAndRedirect = async (redirectTo = '/'): Promise<void> => {
  let cleared = false;

  try {
    const result = await authClient.signOut();
    cleared = !result.error;
  }
  catch {
    cleared = false;
  }

  if (!cleared) {
    cleared = await postSignOut();
  }

  location.replace(redirectTo);
};
