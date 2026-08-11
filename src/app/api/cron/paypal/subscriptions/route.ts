import { NextResponse } from 'next/server';
import { canManageDuesAdmin } from '@/lib/dues';
import { isPaypalRestConfigured } from '@/lib/paypal';
import { syncPaypalSubscriptions } from '@/lib/paypal-subscription-sync';
import { getMembershipNumber } from '@/lib/session';

export const POST = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await canManageDuesAdmin(membershipNumber))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isPaypalRestConfigured()) {
    return NextResponse.json(
      { error: 'PayPal REST credentials are not configured' },
      { status: 503 },
    );
  }

  const result = await syncPaypalSubscriptions();
  return NextResponse.json({ ok: true, result });
};
