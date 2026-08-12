export type GalleryAsset = {
  capturedAt: null | string;
  filename: string;
  id: string;
};

export const galleryAssetUrl = (
  assetId: string,
  size: 'fullsize' | 'preview',
): string => `/api/members/galleries/assets/${assetId}?size=${size}`;
