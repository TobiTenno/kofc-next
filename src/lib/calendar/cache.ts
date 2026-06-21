import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { appMeta } from '@/db/schema';
import {
  buildBirthdaysCalendar,
  buildCouncilCalendar,
  buildMemberEventsCalendar,
} from '@/lib/calendar/ics-generator';

const cacheDir = path.join(process.cwd(), 'data', 'cache', 'calendar');

export type CalendarFeed = 'council' | 'member-events' | 'birthdays';

const feedFiles: Record<CalendarFeed, string> = {
  council: 'council.ics',
  'member-events': 'member-events.ics',
  birthdays: 'birthdays.ics',
};

const ensureCacheDir = (): void => {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
};

const writeFeed = async (feed: CalendarFeed): Promise<string> => {
  ensureCacheDir();
  const content =
    feed === 'council'
      ? await buildCouncilCalendar()
      : feed === 'member-events'
        ? await buildMemberEventsCalendar()
        : await buildBirthdaysCalendar();

  const filePath = path.join(cacheDir, feedFiles[feed]);
  fs.writeFileSync(filePath, content, 'utf8');

  const hash = createHash('sha256').update(content).digest('hex');
  await db
    .insert(appMeta)
    .values({ key: `calendar_${feed}_hash`, value: hash })
    .onConflictDoUpdate({
      target: appMeta.key,
      set: { value: hash },
    });

  return filePath;
};

export const rebuildCalendarCache = async (): Promise<void> => {
  await writeFeed('council');
  await writeFeed('member-events');
  await writeFeed('birthdays');
};

export const getCachedFeedPath = (feed: CalendarFeed): string =>
  path.join(cacheDir, feedFiles[feed]);

export const readCachedFeed = (feed: CalendarFeed): string | null => {
  const filePath = getCachedFeedPath(feed);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
};

export const ensureFeedCached = async (feed: CalendarFeed): Promise<string> => {
  const filePath = getCachedFeedPath(feed);
  if (!fs.existsSync(filePath)) {
    return writeFeed(feed);
  }
  return filePath;
};

export const getCalendarMeta = async (
  feed: CalendarFeed,
): Promise<{ hash: string | null; mtime: Date | null }> => {
  const rows = await db
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, `calendar_${feed}_hash`))
    .limit(1);

  const filePath = getCachedFeedPath(feed);
  const mtime = fs.existsSync(filePath) ? fs.statSync(filePath).mtime : null;

  return { hash: rows[0]?.value ?? null, mtime };
};
