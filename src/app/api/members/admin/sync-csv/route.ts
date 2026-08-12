import { NextResponse } from 'next/server';

import { recordAuditEvent } from '@/lib/audit';
import { rebuildCalendarCache } from '@/lib/calendar/cache';
import { syncCouncilCsv } from '@/lib/csv-sync';
import { hasPermission } from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';

export const POST = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageRoster'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await syncCouncilCsv();
  await rebuildCalendarCache();
  await recordAuditEvent({
    action: 'roster.sync',
    actorMembershipNumber: membershipNumber,
    metadata: result,
    summary: `Synced roster from disk (${result.upserted} active, ${result.deactivated} deactivated)`,
  });
  return NextResponse.json({ ok: true, ...result });
};
