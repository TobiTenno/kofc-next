import { NextResponse } from 'next/server';
import { getMemberPaymentStatus } from '@/lib/dues';
import { requireMembershipNumber } from '@/lib/session';

export const GET = async (): Promise<NextResponse> => {
  try {
    const membershipNumber = await requireMembershipNumber();
    const status = await getMemberPaymentStatus(membershipNumber);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
};
