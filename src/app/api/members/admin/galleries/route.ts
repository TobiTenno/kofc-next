import { NextResponse } from 'next/server';

import { createGallery, listAllGalleries } from '@/lib/galleries';
import { isImmichConfigured } from '@/lib/immich/client';
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

  const galleries = await listAllGalleries();
  return NextResponse.json({
    galleries: galleries.map(gallery => ({
      active: gallery.active,
      allowMemberUploads: gallery.allowMemberUploads,
      description: gallery.description,
      id: gallery.id,
      immichAlbumId: gallery.immichAlbumId,
      title: gallery.title,
      updatedAt: gallery.updatedAt.toISOString(),
    })),
  });
};

export const POST = async (request: Request): Promise<NextResponse> => {
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

  const body = (await request.json()) as {
    allowMemberUploads?: boolean;
    description?: string;
    immichAlbumId?: string;
    title?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  try {
    const gallery = await createGallery({
      allowMemberUploads: body.allowMemberUploads ?? true,
      createdBy: membershipNumber,
      description: body.description?.trim(),
      immichAlbumId: body.immichAlbumId?.trim() || undefined,
      title: body.title.trim(),
    });

    return NextResponse.json({ gallery: { id: gallery.id } });
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
