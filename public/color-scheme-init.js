// Must stay in sync with colorSchemeStorageKey in src/lib/color-scheme.ts
(() => {
  try {
    const key = 'kofc-color-scheme';
    const preference = localStorage.getItem(key) || 'system';
    const dark =
      preference === 'dark' ||
      (preference === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.dataset.colorScheme = preference;
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch {
    // localStorage blocked or unavailable
  }
})();
