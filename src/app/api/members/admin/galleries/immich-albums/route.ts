import { NextResponse } from 'next/server';
import { db } from '@/db';
import { photoGalleries } from '@/db/schema';
import { isImmichConfigured, listImmichAlbums } from '@/lib/immich/client';
import { hasPermission } from '@/lib/permissions-sync';
import { requireMembershipNumber } from '@/lib/session';

export const GET = async (): Promise<NextResponse> => {
  const membershipNumber = await requireMembershipNumber().catch(() => null);
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageGalleries'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isImmichConfigured()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const [albums, linkedRows] = await Promise.all([
      listImmichAlbums(),
      db
        .select({ immichAlbumId: photoGalleries.immichAlbumId })
        .from(photoGalleries),
    ]);

    const linkedIds = new Set(linkedRows.map((row) => row.immichAlbumId));

    return NextResponse.json({
      albums: albums
        .filter((album) => !linkedIds.has(album.id))
        .map((album) => ({
          id: album.id,
          name: album.albumName,
          description: album.description,
          assetCount: album.assetCount ?? 0,
          thumbnailAssetId: album.albumThumbnailAssetId ?? null,
        })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not load Immich albums';
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
