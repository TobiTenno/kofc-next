'use client';

import createCache, { type Options as CacheOptions } from '@emotion/cache';
import {
  CacheProvider as DefaultCacheProvider,
  type EmotionCache,
} from '@emotion/react';
import { useServerInsertedHTML } from 'next/navigation';
import * as React from 'react';

type AppRouterCacheProviderProps = {
  options?: Partial<CacheOptions> & { enableCssLayer?: boolean };
  CacheProvider?: React.ComponentType<{
    value: EmotionCache;
    children: React.ReactNode;
  }>;
  children: React.ReactNode;
};

/**
 * Emotion SSR cache for App Router — same behavior as @mui/material-nextjs
 * AppRouterCacheProvider, without CJS next/* bridge files that break under Vite.
 */
export function AppRouterCacheProvider({
  options,
  CacheProvider = DefaultCacheProvider,
  children,
}: AppRouterCacheProviderProps) {
  const [registry] = React.useState(() => {
    const cache = createCache({
      ...options,
      key: options?.key ?? 'mui',
    });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: Array<{ name: string; isGlobal: boolean }> = [];

    cache.insert = (...args) => {
      if (
        options?.enableCssLayer &&
        !args[1].styles.match(/^@layer\s+[^{]*$/)
      ) {
        args[1].styles = `@layer mui {${args[1].styles}}`;
      }
      const [selector, serialized] = args;
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push({
          name: serialized.name,
          isGlobal: !selector,
        });
      }
      return prevInsert(...args);
    };

    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };

    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const inserted = registry.flush();
    if (inserted.length === 0) {
      return null;
    }

    let styles = '';
    let dataEmotionAttribute = registry.cache.key;
    const globals: Array<{ name: string; style: string }> = [];

    for (const { name, isGlobal } of inserted) {
      const style = registry.cache.inserted[name];
      if (typeof style === 'string') {
        if (isGlobal) {
          globals.push({ name, style });
        } else {
          styles += style;
          dataEmotionAttribute += ` ${name}`;
        }
      }
    }

    return (
      <>
        {globals.map(({ name, style }) => (
          <style
            key={name}
            nonce={options?.nonce}
            data-emotion={`${registry.cache.key}-global ${name}`}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Emotion SSR styles
            dangerouslySetInnerHTML={{ __html: style }}
          />
        ))}
        {styles ? (
          <style
            nonce={options?.nonce}
            data-emotion={dataEmotionAttribute}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Emotion SSR styles
            dangerouslySetInnerHTML={{ __html: styles }}
          />
        ) : null}
      </>
    );
  });

  return <CacheProvider value={registry.cache}>{children}</CacheProvider>;
}
