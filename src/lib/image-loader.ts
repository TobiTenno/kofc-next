import type { ImageLoaderProps } from 'next/image';

/** Routes local static images through `/api/image` (resize + disk cache). */
export default function imageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  const q = quality ?? 75;
  return `/api/image?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
}
