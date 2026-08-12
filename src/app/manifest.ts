import type { MetadataRoute } from 'next';

import {
  getPwaLabels,
  pwaBackgroundColorLight,
  pwaIcons,
  pwaThemeColorLight,
} from '@/lib/pwa';

export default function manifest(): MetadataRoute.Manifest {
  const { description, fullName, shortName } = getPwaLabels();

  return {
    background_color: pwaBackgroundColorLight,
    categories: ['lifestyle', 'social'],
    description,
    display: 'standalone',
    icons: pwaIcons.map(icon => ({
      purpose: icon.purpose,
      sizes: icon.sizes,
      src: icon.src,
      type: icon.type,
    })),
    id: '/',
    lang: 'en',
    name: fullName,
    orientation: 'any',
    scope: '/',
    short_name: shortName,
    shortcuts: [
      {
        description: 'Council calendar',
        name: 'Calendar',
        short_name: 'Calendar',
        url: '/members/calendar',
      },
      {
        description: 'View and pay dues',
        name: 'Dues',
        short_name: 'Dues',
        url: '/members/dues',
      },
      {
        description: 'Member portal home',
        name: 'Members',
        short_name: 'Members',
        url: '/members',
      },
    ],
    start_url: '/',
    theme_color: pwaThemeColorLight,
  };
}
