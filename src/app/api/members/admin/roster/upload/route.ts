import { NextResponse } from 'next/server';
import { recordAuditEvent } from '@/lib/audit';
import { rebuildCalendarCache } from '@/lib/calendar/cache';
import { syncCouncilCsv, writeCouncilCsv } from '@/lib/csv-sync';
import { hasPermission } from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';

export const POST = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageRoster'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing CSV file' }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    return NextResponse.json(
      { error: 'Upload a .csv roster file' },
      { status: 400 },
    );
  }

  const content = await file.text();

  try {
    const written = writeCouncilCsv(content);
    const result = await syncCouncilCsv();
    await rebuildCalendarCache();
    await recordAuditEvent({
      actorMembershipNumber: membershipNumber,
      action: 'roster.upload',
      summary: `Uploaded roster CSV (${written.rowCount} rows, ${result.upserted} active)`,
      metadata: { ...written, ...result, filename: file.name },
    });
    return NextResponse.json({ ok: true, ...written, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not process CSV';
    return NextResponse.json({ error: message }, { status: 400 });
  }
};
