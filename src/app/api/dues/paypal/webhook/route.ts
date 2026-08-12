import { NextResponse } from 'next/server';

import {
  getMemberDuesAmount,
  recordPaypalPayment,
  upsertDuesSubscription,
} from '@/lib/dues';
import {
  getPaypalWebhookId,
  mapPaypalStatusToLocal,
  verifyPaypalWebhookSignature,
} from '@/lib/paypal';
import { findSubscriptionByPaypalId } from '@/lib/paypal-subscription-sync';
import { getCurrentCouncilYear } from '@/lib/permissions-sync';

type PaypalWebhookEvent = {
  event_type?: string;
  id?: string;
  resource?: {
    amount?: { total?: string; value?: string };
    billing_agreement_id?: string;
    billing_info?: {
      last_payment?: { time?: string };
      next_billing_time?: string;
    };
    custom_id?: string;
    id?: string;
    plan_id?: string;
    status?: string;
    subscriber?: { email_address?: string };
  };
};

const parseCustomId = (
  customId: string | undefined,
): null | { councilYear: string; membershipNumber: string } => {
  if (!customId) {
    return null;
  }
  const [membershipNumber, councilYear] = customId.split('|', 2);
  if (!membershipNumber || !councilYear) {
    return null;
  }
  return { councilYear, membershipNumber };
};

const parseTime = (value: string | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const handleSubscriptionLifecycle = async (
  event: PaypalWebhookEvent,
): Promise<void> => {
  const resource = event.resource;
  const subscriptionId = resource?.id;
  if (!subscriptionId || !resource?.status) {
    return;
  }

  const existing = await findSubscriptionByPaypalId(subscriptionId);
  const custom = parseCustomId(resource.custom_id);
  const membershipNumber
    = existing?.membershipNumber ?? custom?.membershipNumber;
  if (!membershipNumber) {
    return;
  }

  const dues = await getMemberDuesAmount(membershipNumber);
  if (!dues && !existing) {
    return;
  }

  await upsertDuesSubscription({
    amountCents: dues?.amountCents ?? existing?.amountCents ?? 0,
    lastPaymentAt: parseTime(resource.billing_info?.last_payment?.time),
    memberClass: dues?.memberClass ?? existing?.memberClass ?? 'R',
    membershipNumber,
    nextBillingAt: parseTime(resource.billing_info?.next_billing_time),
    payerEmail: resource.subscriber?.email_address ?? existing?.payerEmail,
    paypalPlanId: resource.plan_id ?? existing?.paypalPlanId ?? '',
    paypalSubscriptionId: subscriptionId,
    status: mapPaypalStatusToLocal(resource.status),
  });

  // First activation often includes initial payment — credit current year if unpaid.
  if (mapPaypalStatusToLocal(resource.status) === 'active') {
    const councilYear
      = custom?.councilYear
        ?? dues?.councilYear
        ?? (await getCurrentCouncilYear());
    if (dues && councilYear) {
      const txnId = `sub-activate:${subscriptionId}:${event.id ?? resource.status}`;
      await recordPaypalPayment({
        amountCents: dues.amountCents,
        councilYear,
        memberClass: dues.memberClass,
        membershipNumber,
        payerEmail: resource.subscriber?.email_address,
        paypalSubscriptionId: subscriptionId,
        paypalTxnId: txnId,
        source: 'paypal_subscription',
      });
    }
  }
};

const handleSaleCompleted = async (
  event: PaypalWebhookEvent,
): Promise<void> => {
  const resource = event.resource;
  const subscriptionId
    = resource?.billing_agreement_id ?? resource?.id ?? undefined;
  if (!subscriptionId) {
    return;
  }

  // Prefer billing_agreement_id for subscription sales.
  const subId = resource?.billing_agreement_id;
  if (!subId) {
    return;
  }

  const existing = await findSubscriptionByPaypalId(subId);
  const custom = parseCustomId(resource?.custom_id);
  const membershipNumber
    = existing?.membershipNumber ?? custom?.membershipNumber;
  if (!membershipNumber) {
    return;
  }

  const dues = await getMemberDuesAmount(membershipNumber);
  const councilYear
    = custom?.councilYear ?? dues?.councilYear ?? (await getCurrentCouncilYear());

  if (!dues || !councilYear) {
    return;
  }

  const txnId = resource?.id ?? event.id;
  if (!txnId) {
    return;
  }

  await recordPaypalPayment({
    amountCents: dues.amountCents,
    councilYear,
    memberClass: dues.memberClass,
    membershipNumber,
    payerEmail:
      resource?.subscriber?.email_address ?? existing?.payerEmail ?? undefined,
    paypalSubscriptionId: subId,
    paypalTxnId: txnId,
    source: 'paypal_subscription',
  });

  if (existing) {
    await upsertDuesSubscription({
      amountCents: existing.amountCents,
      lastPaymentAt: new Date(),
      memberClass: existing.memberClass,
      membershipNumber,
      nextBillingAt: existing.nextBillingAt,
      payerEmail: existing.payerEmail,
      paypalPlanId: existing.paypalPlanId,
      paypalSubscriptionId: subId,
      status: existing.status,
    });
  }
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const rawBody = await request.text();
  let event: PaypalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaypalWebhookEvent;
  }
  catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const webhookId = getPaypalWebhookId();
  if (webhookId) {
    const transmissionId = request.headers.get('paypal-transmission-id');
    const transmissionTime = request.headers.get('paypal-transmission-time');
    const certUrl = request.headers.get('paypal-cert-url');
    const authAlgo = request.headers.get('paypal-auth-algo');
    const transmissionSig = request.headers.get('paypal-transmission-sig');

    if (
      !transmissionId
      || !transmissionTime
      || !certUrl
      || !authAlgo
      || !transmissionSig
    ) {
      return NextResponse.json(
        { error: 'Missing signature headers' },
        { status: 400 },
      );
    }

    const verified = await verifyPaypalWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookEvent: event,
      webhookId,
    });

    if (!verified) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  }

  const eventType = event.event_type ?? '';

  try {
    if (eventType.startsWith('BILLING.SUBSCRIPTION.')) {
      await handleSubscriptionLifecycle(event);
    }
    else if (
      eventType === 'PAYMENT.SALE.COMPLETED'
      || eventType === 'PAYMENT.CAPTURE.COMPLETED'
    ) {
      await handleSaleCompleted(event);
    }
  }
  catch (error) {
    console.error('PayPal webhook handler error:', error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};
