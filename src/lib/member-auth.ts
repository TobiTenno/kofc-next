'use client';

import { authClient } from '@/lib/auth-client';

const postSignOut = async (): Promise<boolean> => {
  const response = await fetch('/api/auth/sign-out', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  });

  return response.ok;
};

export const signOutAndRedirect = async (redirectTo = '/'): Promise<void> => {
  let cleared = false;

  try {
    const result = await authClient.signOut();
    cleared = !result.error;
  } catch {
    cleared = false;
  }

  if (!cleared) {
    cleared = await postSignOut();
  }

  window.location.replace(redirectTo);
};
