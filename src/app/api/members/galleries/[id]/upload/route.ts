import { NextResponse } from 'next/server';
import { getGalleryById } from '@/lib/galleries';
import {
  getImmichUploadSession,
  isImmichConfigured,
} from '@/lib/immich/client';
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
  const gallery = await getGalleryById(id);

  if (!gallery?.active) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!gallery.allowMemberUploads) {
    return NextResponse.json({ error: 'Uploads disabled' }, { status: 403 });
  }

  const session = getImmichUploadSession();
  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    uploadUrl: session.uploadUrl,
    apiKey: session.apiKey,
    deviceId: session.deviceId,
    maxBytes: session.maxBytes,
  });
};
