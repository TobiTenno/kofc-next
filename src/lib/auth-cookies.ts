const BETTER_AUTH_MARKER = 'better-auth';

/** ~12 KB — below Node's default 16 KB header cap, above normal single-session size. */
const AGGRESSIVE_PRUNE_COOKIE_HEADER_BYTES = 12_000;

const parseCookieNames = (cookieHeader: string): string[] =>
  cookieHeader
    .split(';')
    .map((part) => part.trim().split('=')[0]?.trim())
    .filter((name): name is string => Boolean(name));

const isBetterAuthCookie = (name: string): boolean =>
  name.includes(BETTER_AUTH_MARKER);

const getBetterAuthSuffix = (name: string): string | null => {
  const withoutSecurePrefix = name.startsWith('__Secure-')
    ? name.slice('__Secure-'.length)
    : name;

  if (!withoutSecurePrefix.startsWith(`${BETTER_AUTH_MARKER}.`)) {
    return null;
  }

  return withoutSecurePrefix.slice(`${BETTER_AUTH_MARKER}.`.length);
};

const isDisabledCacheCookie = (suffix: string): boolean =>
  suffix === 'session_data' ||
  suffix.startsWith('session_data.') ||
  suffix === 'account_data' ||
  suffix.startsWith('account_data.');

/** Cookie names to expire in dev (HttpOnly cookies require Set-Cookie from server). */
export const collectStaleAuthCookies = (
  cookieHeader: string,
  isHttps: boolean,
): string[] => {
  const names = parseCookieNames(cookieHeader);
  const stale = new Set<string>();

  for (const name of names) {
    if (!isBetterAuthCookie(name)) {
      continue;
    }

    const suffix = getBetterAuthSuffix(name);
    if (!suffix) {
      continue;
    }

    if (
      isDisabledCacheCookie(suffix) ||
      suffix === 'bearer-token-confirmation'
    ) {
      stale.add(name);
    }

    const isSecureCookie = name.startsWith('__Secure-');
    if (!isHttps && isSecureCookie) {
      stale.add(name);
    }

    if (isHttps && !isSecureCookie) {
      stale.add(name);
    }
  }

  if (cookieHeader.length >= AGGRESSIVE_PRUNE_COOKIE_HEADER_BYTES) {
    for (const name of names) {
      if (isBetterAuthCookie(name)) {
        stale.add(name);
      }
    }
  }

  return [...stale];
};

export const appendExpiredCookies = (
  response: {
    cookies: {
      set: (
        name: string,
        value: string,
        options?: {
          maxAge?: number;
          path?: string;
          secure?: boolean;
          httpOnly?: boolean;
        },
      ) => void;
    };
  },
  cookieNames: string[],
): void => {
  for (const name of cookieNames) {
    response.cookies.set(name, '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: name.startsWith('__Secure-'),
    });
  }
};
