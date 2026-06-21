import { NextResponse } from 'next/server';
import type { PermissionKey } from '@/lib/permissions-sync';
import {
  getPermissionsFromDb,
  hasPermission,
  updatePermissions,
} from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';

export const GET = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'managePermissions'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await getPermissionsFromDb();
  return NextResponse.json({ permissions });
};

export const PUT = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'managePermissions'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    key?: PermissionKey;
    membershipNumbers?: string[];
  };

  if (!body.key || !body.membershipNumbers) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await updatePermissions(body.key, body.membershipNumbers);
  return NextResponse.json({ ok: true });
};
