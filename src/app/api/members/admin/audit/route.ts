import { NextResponse } from 'next/server';
import { listAuditEvents } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';

export const GET = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'viewAuditLog'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const events = await listAuditEvents(100);
  return NextResponse.json({
    events: events.map((event) => ({
      id: event.id,
      actorMembershipNumber: event.actorMembershipNumber,
      action: event.action,
      summary: event.summary,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
      createdAt: event.createdAt,
    })),
  });
};
