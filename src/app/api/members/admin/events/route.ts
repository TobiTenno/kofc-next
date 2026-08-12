import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { events } from '@/db/schema';
import { recordAuditEvent } from '@/lib/audit';
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
    allDay?: boolean;
    description?: string;
    endAt?: string;
    location?: string;
    recurrenceRule?: string;
    startAt?: string;
    title?: string;
    type?: 'council' | 'member';
  };

  if (!body.title || !body.startAt || !body.type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const now = new Date();
  const id = createId();
  await db.insert(events).values({
    allDay: body.allDay ?? false,
    createdAt: now,
    createdBy: membershipNumber,
    description: body.description ?? null,
    endAt: body.endAt ? new Date(body.endAt) : null,
    id,
    location: body.location ?? null,
    recurrenceRule: body.recurrenceRule ?? null,
    startAt: new Date(body.startAt),
    title: body.title,
    type: body.type,
    updatedAt: now,
  });

  await rebuildCalendarCache();
  await recordAuditEvent({
    action: 'event.create',
    actorMembershipNumber: membershipNumber,
    metadata: { id, type: body.type },
    summary: `Created ${body.type} event “${body.title}”`,
  });
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

  const existing = await db.query.events.findFirst({
    where: eq(events.id, id),
  });

  await db.delete(events).where(eq(events.id, id));
  await rebuildCalendarCache();
  await recordAuditEvent({
    action: 'event.delete',
    actorMembershipNumber: membershipNumber,
    metadata: { id },
    summary: existing
      ? `Deleted event “${existing.title}”`
      : `Deleted event ${id}`,
  });
  return NextResponse.json({ ok: true });
};
