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
    galleries: galleries.map((gallery) => ({
      id: gallery.id,
      title: gallery.title,
      description: gallery.description,
      immichAlbumId: gallery.immichAlbumId,
      allowMemberUploads: gallery.allowMemberUploads,
      active: gallery.active,
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
    title?: string;
    description?: string;
    allowMemberUploads?: boolean;
    immichAlbumId?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  try {
    const gallery = await createGallery({
      title: body.title.trim(),
      description: body.description?.trim(),
      allowMemberUploads: body.allowMemberUploads ?? true,
      createdBy: membershipNumber,
      immichAlbumId: body.immichAlbumId?.trim() || undefined,
    });

    return NextResponse.json({ gallery: { id: gallery.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
