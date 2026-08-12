import { NextResponse } from 'next/server';

import { getGalleryWithImmichAssets } from '@/lib/galleries';
import { isImmichConfigured } from '@/lib/immich/client';
import { getMembershipNumber } from '@/lib/session';

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isImmichConfigured()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { id } = await context.params;

  try {
    const result = await getGalleryWithImmichAssets(id);

    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      assets: result.assets.map(asset => ({
        capturedAt: asset.localDateTime ?? null,
        filename: asset.originalFileName,
        id: asset.id,
        type: asset.type,
      })),
      gallery: {
        allowMemberUploads: result.gallery.allowMemberUploads,
        description: result.gallery.description,
        id: result.gallery.id,
        title: result.gallery.title,
        updatedAt: result.gallery.updatedAt.toISOString(),
      },
    });
  }
  catch (error) {
    const message
      = error instanceof Error ? error.message : 'Could not load gallery photos';
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
