export type GalleryAsset = {
  id: string;
  filename: string;
  capturedAt: string | null;
};

export const galleryAssetUrl = (
  assetId: string,
  size: 'preview' | 'fullsize',
): string => `/api/members/galleries/assets/${assetId}?size=${size}`;
