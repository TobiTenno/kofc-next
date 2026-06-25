import { loadCouncilConfig } from '@/lib/council-config';

export const pwaThemeColorLight = '#172554';
export const pwaThemeColorDark = '#111827';
export const pwaBackgroundColorLight = '#ffffff';
export const pwaBackgroundColorDark = '#1f2937';

export const getPwaLabels = (): {
  fullName: string;
  shortName: string;
  description: string;
} => {
  const { council } = loadCouncilConfig();
  const number = council?.number;
  const name = council?.name;

  const fullName = name
    ? `Knights of Columbus - ${name}`
    : number
      ? `Knights of Columbus - Council ${number}`
      : 'Knights of Columbus';

  const shortName = name ?? (number ? `KofC ${number}` : 'KofC');

  const description = number
    ? `Council ${number} member portal, calendar, dues, and galleries.`
    : 'Knights of Columbus council site.';

  return { fullName, shortName, description };
};

export const pwaIcons = [
  {
    src: '/android-chrome-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/android-chrome-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/android-chrome-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
] as const;
