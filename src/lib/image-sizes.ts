/** Allowed `w` values for `/api/image` (must match next.config.ts images.*). */
export const IMAGE_DEVICE_SIZES = [
  512, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
] as const;

export const IMAGE_SIZES = [
  16, 32, 48, 61, 64, 96, 128, 256, 384, 512,
] as const;

export const ALLOWED_IMAGE_WIDTHS: readonly number[] = [
  ...IMAGE_DEVICE_SIZES,
  ...IMAGE_SIZES,
];
