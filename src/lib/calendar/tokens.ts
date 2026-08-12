import { and, eq, gt } from 'drizzle-orm';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { db } from '@/db';
import { calendarTokens } from '@/db/schema';
import { createId, hashToken } from '@/lib/utils';

export const mintCalendarToken = async (options: {
  feed: 'birthdays';
  membershipNumber: string;
  ttlDays?: number;
}): Promise<string> => {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + (options.ttlDays ?? 90) * 24 * 60 * 60 * 1000,
  );

  await db.insert(calendarTokens).values({
    createdAt: new Date(),
    expiresAt,
    feed: options.feed,
    id: createId(),
    membershipNumber: options.membershipNumber,
    tokenHash,
  });

  return token;
};

export const validateCalendarToken = async (options: {
  feed: 'birthdays';
  token: string;
}): Promise<boolean> => {
  const tokenHash = hashToken(options.token);
  const now = new Date();

  const rows = await db
    .select()
    .from(calendarTokens)
    .where(
      and(
        eq(calendarTokens.tokenHash, tokenHash),
        eq(calendarTokens.feed, options.feed),
        gt(calendarTokens.expiresAt, now),
      ),
    )
    .limit(1);

  return rows.length > 0;
};

export const safeCompareToken = (left: string, right: string): boolean => {
  const leftBuffer = createHash('sha256').update(left).digest();
  const rightBuffer = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftBuffer, rightBuffer);
};
