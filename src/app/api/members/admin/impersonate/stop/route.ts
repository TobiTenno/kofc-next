import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { user } from '@/db/schema';
import { recordAuditEvent } from '@/lib/audit';
import { getSession } from '@/lib/session';

export const POST = async (): Promise<NextResponse> => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUserId = session.session.impersonatedBy;
  if (!adminUserId) {
    return NextResponse.json(
      { error: 'Not impersonating anyone' },
      { status: 400 },
    );
  }

  const adminUser = await db.query.user.findFirst({
    where: eq(user.id, adminUserId),
  });

  await recordAuditEvent({
    action: 'auth.impersonate.stop',
    actorMembershipNumber: adminUser?.username ?? null,
    metadata: {
      adminUserId,
      targetMembershipNumber: session.user.username ?? null,
      targetUserId: session.user.id,
    },
    summary: `Stopped impersonating ${session.user.username ?? 'user'}`,
  });

  return NextResponse.json({ ok: true });
};
