import { NextResponse } from 'next/server';
import { completeGalleryUpload, getGalleryById } from '@/lib/galleries';
import {
  ImmichUploadValidationError,
  isImmichConfigured,
} from '@/lib/immich/client';
import { getMembershipNumber } from '@/lib/session';

export const POST = async (
  request: Request,
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

  const body = (await request.json()) as {
    assetId?: string;
    filename?: string;
  };

  if (!body.assetId?.trim() || !body.filename?.trim()) {
    return NextResponse.json(
      { error: 'Missing assetId or filename' },
      { status: 400 },
    );
  }

  try {
    const result = await completeGalleryUpload({
      gallery,
      membershipNumber,
      assetId: body.assetId.trim(),
      filename: body.filename.trim(),
    });

    return NextResponse.json({ ok: true, assetId: result.assetId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Complete upload failed';
    const status = error instanceof ImmichUploadValidationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};
