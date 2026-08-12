'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
Dev-only: expire stale Better Auth cookies (cache chunks, wrong scheme, header bloat).
*/
export const DevCookieCleanup = () => {
  const pathname = usePathname();

  // Re-prune on every client navigation — pathname drives the effect schedule.
  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/dev/prune-cookies', {
      cache: 'no-store',
      credentials: 'include',
      method: 'POST',
      signal: controller.signal,
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    });

    return () => controller.abort();
  }, [pathname]);

  return null;
};
