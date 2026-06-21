import { NextResponse } from 'next/server';
import {
  fetchImmichAssetMedia,
  type ImmichAssetSize,
  isImmichConfigured,
} from '@/lib/immich/client';
import { getMembershipNumber } from '@/lib/session';

export const runtime = 'nodejs';

const parseSize = (value: string | null): ImmichAssetSize => {
  if (value === 'preview' || value === 'fullsize') {
    return value;
  }

  return 'thumbnail';
};

export const GET = async (
  request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isImmichConfigured()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { assetId } = await context.params;
  const url = new URL(request.url);
  const size = parseSize(url.searchParams.get('size'));

  try {
    const upstream = await fetchImmichAssetMedia(assetId, size);
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }
};
