import { NextResponse } from 'next/server';
import { firstForwardedHeaderValue } from '@/lib/app-origin';
import {
  appendExpiredCookies,
  collectStaleAuthCookies,
} from '@/lib/auth-cookies';

export const POST = async (request: Request): Promise<NextResponse> => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const forwardedProto = firstForwardedHeaderValue(
    request.headers.get('x-forwarded-proto'),
  );
  const isHttps =
    forwardedProto === 'https' || new URL(request.url).protocol === 'https:';

  const pruned = collectStaleAuthCookies(cookieHeader, isHttps);
  const response = NextResponse.json({
    pruned: pruned.length,
    names: pruned,
    cookieHeaderBytes: cookieHeader.length,
  });

  appendExpiredCookies(response, pruned);

  return response;
};
