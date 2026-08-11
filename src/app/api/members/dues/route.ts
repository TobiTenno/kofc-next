import { NextResponse } from 'next/server';
import { getMemberPaymentStatus, getMemberSubscription } from '@/lib/dues';
import { requireMembershipNumber } from '@/lib/session';

export const GET = async (): Promise<NextResponse> => {
  try {
    const membershipNumber = await requireMembershipNumber();
    const status = await getMemberPaymentStatus(membershipNumber);
    const subscription = await getMemberSubscription(membershipNumber);
    return NextResponse.json({ ...status, subscription });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
};
