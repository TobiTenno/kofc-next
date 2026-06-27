'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Dev-only: expire stale Better Auth cookies (cache chunks, wrong scheme, header bloat). */
export const DevCookieCleanup = () => {
  const pathname = usePathname();

  // Re-prune on every client navigation — pathname drives the effect schedule.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional per-route dev cleanup
  useEffect(() => {
    void fetch('/api/dev/prune-cookies', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
  }, [pathname]);

  return null;
};
