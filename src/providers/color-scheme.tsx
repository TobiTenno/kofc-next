'use client';

import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  applyColorScheme,
  type ColorSchemePreference,
  colorSchemeStorageKey,
  readStoredColorScheme,
} from '@/lib/color-scheme';

type ColorSchemeContextValue = {
  preference: ColorSchemePreference;
  setPreference: (preference: ColorSchemePreference) => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

const emptySubscribe = (): (() => void) => () => {};

export const ColorSchemeProvider = ({ children }: { children: ReactNode }) => {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [preference, setPreference] = useState<ColorSchemePreference>('system');
  const [didHydrate, setDidHydrate] = useState(false);

  if (isClient && !didHydrate) {
    setDidHydrate(true);
    setPreference(readStoredColorScheme());
  }

  useEffect(() => {
    applyColorScheme(preference);
    localStorage.setItem(colorSchemeStorageKey, preference);

    if (preference !== 'system') {
      return;
    }

    const media = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const syncSystem = (): void => applyColorScheme('system');
    media.addEventListener('change', syncSystem);
    return () => media.removeEventListener('change', syncSystem);
  }, [preference]);

  const value = useMemo(
    () => ({ preference, setPreference }),
    [preference],
  );

  return <ColorSchemeContext value={value}>{children}</ColorSchemeContext>;
};

export const useColorScheme = (): ColorSchemeContextValue => {
  const context = use(ColorSchemeContext);
  if (!context) {
    throw new Error('useColorScheme must be used within ColorSchemeProvider');
  }
  return context;
};
