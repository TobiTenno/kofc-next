'use client';

import createCache, { type Options as CacheOptions } from '@emotion/cache';
import {
  CacheProvider as DefaultCacheProvider,
  type EmotionCache,
} from '@emotion/react';
import { useServerInsertedHTML } from 'next/navigation';
import * as React from 'react';

type AppRouterCacheProviderProps = {
  CacheProvider?: React.ComponentType<{
    children: React.ReactNode;
    value: EmotionCache;
  }>;
  children: React.ReactNode;
  options?: Partial<CacheOptions> & { enableCssLayer?: boolean };
};

/**
 * Emotion SSR cache for App Router — same behavior as @mui/material-nextjs
 * AppRouterCacheProvider, without CJS next/* bridge files that break under Vite.
 */
export function AppRouterCacheProvider({
  CacheProvider = DefaultCacheProvider,
  children,
  options,
}: AppRouterCacheProviderProps) {
  const [registry] = React.useState(() => {
    const cache = createCache({
      ...options,
      key: options?.key ?? 'mui',
    });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: Array<{ isGlobal: boolean; name: string }> = [];

    cache.insert = (...args) => {
      if (
        options?.enableCssLayer
        && !/^@layer\s+[^{]*$/.test(args[1].styles)
      ) {
        args[1].styles = `@layer mui {${args[1].styles}}`;
      }
      const [selector, serialized] = args;
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push({
          isGlobal: !selector,
          name: serialized.name,
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

    for (const { isGlobal, name } of inserted) {
      const style = registry.cache.inserted[name];
      if (typeof style === 'string') {
        if (isGlobal) {
          globals.push({ name, style });
        }
        else {
          styles += style;
          dataEmotionAttribute += ` ${name}`;
        }
      }
    }

    return (
      <>
        {globals.map(({ name, style }) => (
          <style
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Emotion SSR styles
            dangerouslySetInnerHTML={{ __html: style }}
            data-emotion={`${registry.cache.key}-global ${name}`}
            key={name}
            nonce={options?.nonce}
          />
        ))}
        {styles ? (
          <style
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Emotion SSR styles
            dangerouslySetInnerHTML={{ __html: styles }}
            data-emotion={dataEmotionAttribute}
            nonce={options?.nonce}
          />
        ) : null}
      </>
    );
  });

  return <CacheProvider value={registry.cache}>{children}</CacheProvider>;
}
