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
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: pwaThemeColorLight,
    background_color: pwaBackgroundColorLight,
    icons: pwaIcons.map((icon) => ({
      src: icon.src,
      sizes: icon.sizes,
      type: icon.type,
      purpose: icon.purpose,
    })),
  };
}
