import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ALLOWED_IMAGE_WIDTHS } from '@/lib/image-sizes';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const getImageCacheDir = (): string =>
  process.env.IMAGE_CACHE_DIR?.trim() ||
  path.join(process.cwd(), 'data/cache/images');

export type ImageRequestParams = {
  imageUrl: string;
  width: number;
  quality: number;
};

export const parseImageRequest = (
  searchParams: URLSearchParams,
): ImageRequestParams | null => {
  const imageUrl = searchParams.get('url');
  const widthParam = searchParams.get('w');
  const qualityParam = searchParams.get('q') ?? '75';

  if (!imageUrl || !widthParam || !/^\d+$/.test(widthParam)) {
    return null;
  }

  if (!/^\d+$/.test(qualityParam)) {
    return null;
  }

  const width = Number.parseInt(widthParam, 10);
  const quality = Number.parseInt(qualityParam, 10);

  if (
    width <= 0 ||
    quality < 1 ||
    quality > 100 ||
    !ALLOWED_IMAGE_WIDTHS.includes(width)
  ) {
    return null;
  }

  const normalizedUrl = imageUrl.replaceAll('\\', '/');
  if (!normalizedUrl.startsWith('/') || normalizedUrl.startsWith('//')) {
    return null;
  }

  try {
    const base = 'https://localhost';
    if (new URL(normalizedUrl, base).origin !== base) {
      return null;
    }
  } catch {
    return null;
  }

  return { imageUrl: normalizedUrl, width, quality };
};

const cacheFilePath = (params: ImageRequestParams): string => {
  const key = createHash('sha256')
    .update(`${params.imageUrl}|${params.width}|${params.quality}`)
    .digest('hex');
  return path.join(getImageCacheDir(), `${key}.webp`);
};

const resolvePublicFile = (imageUrl: string): string => {
  const relativePath = imageUrl.replace(/^\/+/, '');
  const publicRoot = path.resolve(process.cwd(), 'public');
  const resolved = path.resolve(publicRoot, relativePath);

  if (
    resolved !== publicRoot &&
    !resolved.startsWith(`${publicRoot}${path.sep}`)
  ) {
    throw new Error('Invalid image path');
  }

  if (!fs.existsSync(resolved)) {
    throw new Error('Image not found');
  }

  return resolved;
};

export const serveCachedImage = async (
  params: ImageRequestParams,
): Promise<{ body: Buffer; cacheControl: string; cacheHit: boolean }> => {
  const cachePath = cacheFilePath(params);

  if (fs.existsSync(cachePath)) {
    return {
      body: fs.readFileSync(cachePath),
      cacheControl: CACHE_CONTROL,
      cacheHit: true,
    };
  }

  const sourcePath = resolvePublicFile(params.imageUrl);
  const body = await sharp(sourcePath)
    .rotate()
    .resize({ width: params.width, withoutEnlargement: true })
    .webp({ quality: params.quality })
    .toBuffer();

  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, body);

  return {
    body,
    cacheControl: CACHE_CONTROL,
    cacheHit: false,
  };
};
