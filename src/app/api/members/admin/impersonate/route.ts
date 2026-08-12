import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { recordAuditEvent } from '@/lib/audit';
import { isWebmaster } from '@/lib/permissions-sync';
import { getSession } from '@/lib/session';

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await getSession();
  const actorMembershipNumber = session?.user.username ?? null;

  if (!session || !actorMembershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.session.impersonatedBy) {
    return NextResponse.json(
      { error: 'Already impersonating. Stop first.' },
      { status: 400 },
    );
  }

  if (!isWebmaster(actorMembershipNumber)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as { membershipNumber?: string };
  const membershipNumber = body.membershipNumber?.trim() ?? '';

  if (!/^\d+$/.test(membershipNumber)) {
    return NextResponse.json(
      { error: 'Membership number must be digits only' },
      { status: 400 },
    );
  }

  if (membershipNumber === actorMembershipNumber) {
    return NextResponse.json(
      { error: 'Cannot impersonate yourself' },
      { status: 400 },
    );
  }

  const target = await db.query.user.findFirst({
    where: eq(user.username, membershipNumber),
  });

  if (!target) {
    return NextResponse.json(
      { error: 'No portal account for that membership number' },
      { status: 404 },
    );
  }

  if (target.role === 'admin' || isWebmaster(membershipNumber)) {
    return NextResponse.json(
      { error: 'Cannot impersonate another admin' },
      { status: 403 },
    );
  }

  await recordAuditEvent({
    actorMembershipNumber,
    action: 'auth.impersonate.start',
    summary: `Impersonating ${membershipNumber}`,
    metadata: {
      targetUserId: target.id,
      targetMembershipNumber: membershipNumber,
    },
  });

  return NextResponse.json({
    userId: target.id,
    membershipNumber,
    name: target.name,
  });
};
