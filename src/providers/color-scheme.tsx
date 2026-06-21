'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

export const ColorSchemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] =
    useState<ColorSchemePreference>('system');

  useEffect(() => {
    setPreferenceState(readStoredColorScheme());
  }, []);

  useEffect(() => {
    applyColorScheme(preference);
    localStorage.setItem(colorSchemeStorageKey, preference);

    if (preference !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystem = (): void => applyColorScheme('system');
    media.addEventListener('change', syncSystem);
    return () => media.removeEventListener('change', syncSystem);
  }, [preference]);

  const setPreference = useCallback((next: ColorSchemePreference): void => {
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference }),
    [preference, setPreference],
  );

  return (
    <ColorSchemeContext.Provider value={value}>
      {children}
    </ColorSchemeContext.Provider>
  );
};

export const useColorScheme = (): ColorSchemeContextValue => {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error('useColorScheme must be used within ColorSchemeProvider');
  }
  return context;
};
