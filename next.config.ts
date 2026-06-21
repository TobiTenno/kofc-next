import type { NextConfig } from 'next';

const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const nextConfig: NextConfig = {
  output: 'standalone',
  compiler: {
    emotion: true,
  },
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
