import { NextResponse } from 'next/server';
import { getPlanIdForMember, upsertDuesSubscription } from '@/lib/dues';
import {
  createPaypalSubscription,
  getAppReturnBase,
  isPaypalSubscriptionsReady,
} from '@/lib/paypal';

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isPaypalSubscriptionsReady()) {
    return NextResponse.json(
      { error: 'PayPal subscriptions are not configured' },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    membershipNumber?: string;
    lastName?: string;
  };

  if (!body.membershipNumber || !body.lastName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const membershipNumber = body.membershipNumber.trim();
  const lastName = body.lastName.trim().toLowerCase();

  const { db } = await import('@/db');
  const { members } = await import('@/db/schema');
  const { and, eq } = await import('drizzle-orm');

  const member = await db.query.members.findFirst({
    where: and(
      eq(members.membershipNumber, membershipNumber),
      eq(members.active, true),
    ),
  });

  if (!member || member.lastName.toLowerCase() !== lastName) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const plan = await getPlanIdForMember(membershipNumber);
  if (!plan) {
    return NextResponse.json(
      { error: 'No PayPal plan for this member class' },
      { status: 400 },
    );
  }

  const base = getAppReturnBase().replace(/\/$/, '');

  try {
    const subscription = await createPaypalSubscription({
      planId: plan.planId,
      membershipNumber,
      councilYear: plan.dues.councilYear,
      returnUrl: `${base}/dues/thank-you`,
      cancelUrl: `${base}/dues/pay?member=${encodeURIComponent(membershipNumber)}`,
    });

    await upsertDuesSubscription({
      membershipNumber,
      paypalSubscriptionId: subscription.id,
      paypalPlanId: plan.planId,
      status: 'approval_pending',
      memberClass: plan.dues.memberClass,
      amountCents: plan.dues.amountCents,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      approveUrl: subscription.approveUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not create PayPal subscription',
      },
      { status: 502 },
    );
  }
};
