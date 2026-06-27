import type { NextConfig } from 'vinext';
import { IMAGE_DEVICE_SIZES, IMAGE_SIZES } from './src/lib/image-sizes';

const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    imageSizes: [...IMAGE_SIZES],
    deviceSizes: [...IMAGE_DEVICE_SIZES],
  },
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
