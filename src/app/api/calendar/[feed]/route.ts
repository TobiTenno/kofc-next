import { NextResponse } from 'next/server';
import fs from 'node:fs';

import {
  type CalendarFeed,
  ensureFeedCached,
  getCalendarMeta,
  readCachedFeed,
} from '@/lib/calendar/cache';
import { validateCalendarToken } from '@/lib/calendar/tokens';

const feedMap: Record<string, CalendarFeed> = {
  'birthdays.ics': 'birthdays',
  'council.ics': 'council',
  'member-events.ics': 'member-events',
};

export const GET = async (
  request: Request,
  context: { params: Promise<{ feed: string }> },
): Promise<NextResponse> => {
  const { feed: feedParam } = await context.params;
  const feed = feedMap[feedParam];

  if (!feed) {
    return NextResponse.json({ error: 'Unknown feed' }, { status: 404 });
  }

  if (feed === 'birthdays') {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (
      !token
      || !(await validateCalendarToken({ feed: 'birthdays', token }))
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const filePath = await ensureFeedCached(feed);
  const content = readCachedFeed(feed) ?? fs.readFileSync(filePath, 'utf8');
  const meta = await getCalendarMeta(feed);

  return new NextResponse(content, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'text/calendar; charset=utf-8',
      ...(meta.mtime && { 'Last-Modified': meta.mtime.toUTCString() }),
      ...(meta.hash && { ETag: `"${meta.hash}"` }),
    },
  });
};
