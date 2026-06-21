import { type NextRequest, NextResponse } from 'next/server';
import {
  shouldRedirectToCanonicalOrigin,
  toCanonicalUrl,
} from '@/lib/app-origin';
import { auth } from '@/lib/auth';

const publicPaths = ['/members/login', '/members/register'];

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  if (shouldRedirectToCanonicalOrigin(request.nextUrl.host)) {
    const target = toCanonicalUrl(request.url);
    if (target) {
      return NextResponse.redirect(target);
    }
  }

  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/members') || pathname.startsWith('/api/members')) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      const loginUrl = new URL('/members/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/members/:path*', '/api/members/:path*', '/api/auth/:path*'],
};
