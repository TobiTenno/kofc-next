import { NextResponse } from 'next/server';

import { getGalleryById, updateGallery } from '@/lib/galleries';
import { isImmichConfigured } from '@/lib/immich/client';
import { hasPermission } from '@/lib/permissions-sync';
import { requireMembershipNumber } from '@/lib/session';

export const PATCH = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
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

  const { id } = await context.params;
  const existing = await getGalleryById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await request.json()) as {
    active?: boolean;
    allowMemberUploads?: boolean;
    description?: string;
    title?: string;
  };

  const updated = await updateGallery(
    id,
    {
      ...((body.title !== undefined) && { title: body.title.trim() }),
      ...((body.description !== undefined) && { description: body.description.trim() || null }),
      ...((body.allowMemberUploads !== undefined) && { allowMemberUploads: body.allowMemberUploads }),
      ...((body.active !== undefined) && { active: body.active }),
    },
    membershipNumber,
  );

  return NextResponse.json({ gallery: updated, ok: true });
};
