import { NextResponse } from 'next/server';
import { listActiveGalleries } from '@/lib/galleries';
import { getImmichAlbum, isImmichConfigured } from '@/lib/immich/client';
import { hasPermission } from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';

export const GET = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isImmichConfigured()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [galleries, canManageGalleries] = await Promise.all([
    listActiveGalleries(),
    hasPermission(membershipNumber, 'manageGalleries'),
  ]);
  const enriched = await Promise.all(
    galleries.map(async (gallery) => {
      try {
        const album = await getImmichAlbum(gallery.immichAlbumId);
        return {
          id: gallery.id,
          title: gallery.title,
          description: gallery.description,
          allowMemberUploads: gallery.allowMemberUploads,
          updatedAt: gallery.updatedAt.toISOString(),
          assetCount: album.assetCount ?? 0,
          coverAssetId: album.albumThumbnailAssetId ?? null,
        };
      } catch {
        return {
          id: gallery.id,
          title: gallery.title,
          description: gallery.description,
          allowMemberUploads: gallery.allowMemberUploads,
          updatedAt: gallery.updatedAt.toISOString(),
          assetCount: 0,
          coverAssetId: null,
        };
      }
    }),
  );

  return NextResponse.json({ galleries: enriched, canManageGalleries });
};
