import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { events } from '@/db/schema';
import { rebuildCalendarCache } from '@/lib/calendar/cache';
import { hasPermission } from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';
import { createId } from '@/lib/utils';

export const GET = async (): Promise<NextResponse> => {
  const rows = await db.select().from(events).orderBy(events.startAt);
  return NextResponse.json({ events: rows });
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageEvents'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    location?: string;
    startAt?: string;
    endAt?: string;
    allDay?: boolean;
    type?: 'council' | 'member';
    recurrenceRule?: string;
  };

  if (!body.title || !body.startAt || !body.type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const now = new Date();
  await db.insert(events).values({
    id: createId(),
    title: body.title,
    description: body.description ?? null,
    location: body.location ?? null,
    startAt: new Date(body.startAt),
    endAt: body.endAt ? new Date(body.endAt) : null,
    allDay: body.allDay ?? false,
    type: body.type,
    recurrenceRule: body.recurrenceRule ?? null,
    createdBy: membershipNumber,
    createdAt: now,
    updatedAt: now,
  });

  await rebuildCalendarCache();
  return NextResponse.json({ ok: true });
};

export const DELETE = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageEvents'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await db.delete(events).where(eq(events.id, id));
  await rebuildCalendarCache();
  return NextResponse.json({ ok: true });
};
