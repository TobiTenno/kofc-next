import { getCanonicalAppOrigin, isLoopbackHost } from '@/lib/app-origin';

const addOrigin = (origins: Set<string>, value?: string | null): void => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return;
  }

  if (trimmed.includes('://')) {
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      // ignore invalid URL
    }
    return;
  }

  const host = trimmed.replace(/\/+$/, '');
  origins.add(`http://${host}`);
  origins.add(`https://${host}`);

  if (!host.includes(':')) {
    origins.add(`http://${host}:3000`);
    origins.add(`https://${host}:3000`);
  }
};

/** Origins allowed for Better Auth CSRF / callback checks. */
export const getAuthTrustedOrigins = (): string[] => {
  const origins = new Set<string>();

  addOrigin(origins, process.env.BETTER_AUTH_URL);
  addOrigin(origins, process.env.NEXT_PUBLIC_APP_URL);

  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    for (const entry of process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',')) {
      addOrigin(origins, entry);
    }
  }

  if (process.env.ALLOWED_DEV_ORIGINS) {
    for (const entry of process.env.ALLOWED_DEV_ORIGINS.split(',')) {
      addOrigin(origins, entry);
    }
  }

  const canonical = getCanonicalAppOrigin();
  if (process.env.NODE_ENV !== 'production' && canonical) {
    try {
      const hostname = new URL(canonical).hostname;
      if (isLoopbackHost(hostname)) {
        origins.add('http://localhost:3000');
        origins.add('http://127.0.0.1:3000');
      }
    } catch {
      // ignore invalid canonical URL
    }
  }

  return [...origins];
};
