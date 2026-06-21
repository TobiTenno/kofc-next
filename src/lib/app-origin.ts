export const isLoopbackHost = (hostname: string): boolean =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]' ||
  hostname.endsWith('.localhost');

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
    if (canonicalUrl.host === requestHost) {
      return false;
    }

    const requestHostname = requestHost.split(':')[0] ?? requestHost;
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
