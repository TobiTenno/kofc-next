import type { NextConfig } from 'vinext';
import { IMAGE_DEVICE_SIZES, IMAGE_SIZES } from './src/lib/image-sizes';

const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const nextConfig: NextConfig = {
  output: 'standalone',
  // Keep drizzle unbundled. Rolldown otherwise splits orm + schema into
  // circular ESM chunks; Table is undefined → `.Symbol` crash on start.
  serverExternalPackages: ['drizzle-orm'],
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    imageSizes: [...IMAGE_SIZES],
    deviceSizes: [...IMAGE_DEVICE_SIZES],
  },
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
