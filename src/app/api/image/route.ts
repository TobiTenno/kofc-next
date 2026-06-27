import { NextResponse } from 'next/server';
import { parseImageRequest, serveCachedImage } from '@/lib/image-cache';

export const GET = async (request: Request): Promise<NextResponse> => {
  const params = parseImageRequest(new URL(request.url).searchParams);

  if (!params) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  try {
    const { body, cacheControl, cacheHit } = await serveCachedImage(params);

    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': cacheControl,
        'X-Image-Cache': cacheHit ? 'HIT' : 'MISS',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
};
