import type { MetadataRoute } from 'next';
import {
  getPwaLabels,
  pwaBackgroundColorLight,
  pwaIcons,
  pwaThemeColorLight,
} from '@/lib/pwa';

export default function manifest(): MetadataRoute.Manifest {
  const { fullName, shortName, description } = getPwaLabels();

  return {
    id: '/',
    name: fullName,
    short_name: shortName,
    description,
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: pwaThemeColorLight,
    background_color: pwaBackgroundColorLight,
    categories: ['lifestyle', 'social'],
    icons: pwaIcons.map((icon) => ({
      src: icon.src,
      sizes: icon.sizes,
      type: icon.type,
      purpose: icon.purpose,
    })),
    shortcuts: [
      {
        name: 'Calendar',
        short_name: 'Calendar',
        url: '/members/calendar',
        description: 'Council calendar',
      },
      {
        name: 'Dues',
        short_name: 'Dues',
        url: '/members/dues',
        description: 'View and pay dues',
      },
      {
        name: 'Members',
        short_name: 'Members',
        url: '/members',
        description: 'Member portal home',
      },
    ],
  };
}
