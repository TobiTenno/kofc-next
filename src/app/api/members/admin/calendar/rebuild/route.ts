import { NextResponse } from 'next/server';
import { recordAuditEvent } from '@/lib/audit';
import { rebuildCalendarCache } from '@/lib/calendar/cache';
import { hasPermission } from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';

export const POST = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageEvents'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await rebuildCalendarCache();
  await recordAuditEvent({
    actorMembershipNumber: membershipNumber,
    action: 'calendar.rebuild',
    summary: 'Rebuilt calendar cache',
  });
  return NextResponse.json({ ok: true });
};
