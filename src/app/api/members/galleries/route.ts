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
          allowMemberUploads: gallery.allowMemberUploads,
          assetCount: album.assetCount ?? 0,
          coverAssetId: album.albumThumbnailAssetId ?? null,
          description: gallery.description,
          id: gallery.id,
          title: gallery.title,
          updatedAt: gallery.updatedAt.toISOString(),
        };
      }
      catch {
        return {
          allowMemberUploads: gallery.allowMemberUploads,
          assetCount: 0,
          coverAssetId: null,
          description: gallery.description,
          id: gallery.id,
          title: gallery.title,
          updatedAt: gallery.updatedAt.toISOString(),
        };
      }
    }),
  );

  return NextResponse.json({ canManageGalleries, galleries: enriched });
};
