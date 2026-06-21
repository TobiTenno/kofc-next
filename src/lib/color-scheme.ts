export type ColorSchemePreference = 'system' | 'light' | 'dark';

export const colorSchemeStorageKey = 'kofc-color-scheme';

export const resolveColorScheme = (
  preference: ColorSchemePreference,
  systemPrefersDark: boolean,
): 'light' | 'dark' => {
  if (preference === 'dark') {
    return 'dark';
  }

  if (preference === 'light') {
    return 'light';
  }

  return systemPrefersDark ? 'dark' : 'light';
};

export const readStoredColorScheme = (): ColorSchemePreference => {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const stored = localStorage.getItem(colorSchemeStorageKey);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }

  return 'system';
};

export const applyColorScheme = (preference: ColorSchemePreference): void => {
  const systemPrefersDark = window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches;
  const resolved = resolveColorScheme(preference, systemPrefersDark);
  const root = document.documentElement;

  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.colorScheme = preference;
  root.style.colorScheme = resolved;
};

// Blocking init: public/color-scheme-init.js (loaded from layout via next/script).
