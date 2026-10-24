import type { ImageLoaderProps } from 'next/image';

/**
Routes local static images through `/api/image` (resize + disk cache).
*/
export default function imageLoader({
  quality = 75,
  src,
  width,
}: ImageLoaderProps): string {
  return src.startsWith('http://') || src.startsWith('https://')
    ? src
    : `/api/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
