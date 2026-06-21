export const isLoopbackHost = (hostname: string): boolean =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]' ||
  hostname.endsWith('.localhost');

/** First value when a reverse proxy forwards comma-separated headers. */
export const firstForwardedHeaderValue = (
  value: string | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }

  const first = value.split(',')[0]?.trim();
  return first || null;
};

/** Client-facing host (X-Forwarded-Host, then Host, then Next URL). */
export const getRequestHost = (
  headers: Headers,
  fallbackHost: string,
): string =>
  firstForwardedHeaderValue(headers.get('x-forwarded-host')) ??
  headers.get('host') ??
  fallbackHost;

/** Client-facing protocol from X-Forwarded-Proto when present. */
export const getRequestProtocol = (
  headers: Headers,
  fallbackProtocol: string,
): string => {
  const forwarded = firstForwardedHeaderValue(headers.get('x-forwarded-proto'));
  if (forwarded === 'https' || forwarded === 'http') {
    return `${forwarded}:`;
  }

  return fallbackProtocol;
};

/** Absolute URL using client-facing host/proto (required for proxy redirects). */
export const buildExternalRequestUrl = (
  headers: Headers,
  fallbackUrl: URL,
  pathname: string,
  search = '',
): URL => {
  const protocol = getRequestProtocol(headers, fallbackUrl.protocol);
  const host = getRequestHost(headers, fallbackUrl.host);
  return new URL(`${pathname}${search}`, `${protocol}//${host}`);
};

/** Canonical browser origin from env (NEXT_PUBLIC_APP_URL preferred). */
export const getCanonicalAppOrigin = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
};

/** Redirect loopback visits when the app is configured for a LAN/production host. */
export const shouldRedirectToCanonicalOrigin = (
  requestHost: string,
): boolean => {
  const canonical = getCanonicalAppOrigin();
  if (!canonical) {
    return false;
  }

  try {
    const canonicalUrl = new URL(canonical);
    const requestHostname = requestHost.split(':')[0] ?? requestHost;
    if (
      canonicalUrl.hostname === requestHostname ||
      canonicalUrl.host === requestHost
    ) {
      return false;
    }

    return (
      isLoopbackHost(requestHostname) && !isLoopbackHost(canonicalUrl.hostname)
    );
  } catch {
    return false;
  }
};

export const toCanonicalUrl = (requestUrl: string): URL | null => {
  const canonical = getCanonicalAppOrigin();
  if (!canonical) {
    return null;
  }

  try {
    const url = new URL(requestUrl);
    const canonicalUrl = new URL(canonical);
    url.protocol = canonicalUrl.protocol;
    url.host = canonicalUrl.host;
    return url;
  } catch {
    return null;
  }
};
