import { loadCouncilConfig } from '@/lib/council-config';

export const pwaThemeColorLight = '#172554';
export const pwaThemeColorDark = '#111827';
export const pwaBackgroundColorLight = '#ffffff';
export const pwaBackgroundColorDark = '#1f2937';

export const getPwaLabels = (): {
  description: string;
  fullName: string;
  shortName: string;
} => {
  const { council } = loadCouncilConfig();
  const number = council?.number;
  const name = council?.name;

  const fullName = name
    ? `Knights of Columbus - ${name}`
    : (number
        ? `Knights of Columbus - Council ${number}`
        : 'Knights of Columbus');

  const shortName = name ?? (number ? `KofC ${number}` : 'KofC');

  const description = number
    ? `Council ${number} member portal, calendar, dues, and galleries.`
    : 'Knights of Columbus council site.';

  return { description, fullName, shortName };
};

export const pwaIcons = [
  {
    purpose: 'any',
    sizes: '192x192',
    src: '/android-chrome-192x192.png',
    type: 'image/png',
  },
  {
    purpose: 'any',
    sizes: '512x512',
    src: '/android-chrome-512x512.png',
    type: 'image/png',
  },
  {
    purpose: 'maskable',
    sizes: '512x512',
    src: '/android-chrome-maskable-512x512.png',
    type: 'image/png',
  },
] as const;
