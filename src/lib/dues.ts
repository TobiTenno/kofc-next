import { and, eq, ne } from 'drizzle-orm';

import { db } from '@/db';
import {
  duesPayments,
  duesRates,
  duesSubscriptions,
  members,
} from '@/db/schema';
import { loadCouncilConfig } from '@/lib/council-config';
import {
  getPaypalPlanIdForClass,
  isPaypalRestConfigured,
  isPaypalSubscriptionsReady,
} from '@/lib/paypal';
import { getCurrentCouncilYear } from '@/lib/permissions-sync';

export const getMemberDuesAmount = async (
  membershipNumber: string,
): Promise<null | {
  amountCents: number;
  councilYear: string;
  memberClass: string;
}> => {
  const member = await db.query.members.findFirst({
    where: eq(members.membershipNumber, membershipNumber),
  });

  if (!member?.active || !member.memberClass) {
    return null;
  }

  const councilYear = (await getCurrentCouncilYear()) ?? '';
  const rate = await db.query.duesRates.findFirst({
    where: eq(duesRates.memberClass, member.memberClass),
  });

  if (!rate) {
    return null;
  }

  return {
    amountCents: rate.amountCents,
    councilYear: rate.councilYear ?? councilYear,
    memberClass: member.memberClass,
  };
};

export const getPaidMembershipNumbersForCouncilYear = async (
  councilYear: string,
): Promise<Set<string>> => {
  const rows = await db
    .select({ membershipNumber: duesPayments.membershipNumber })
    .from(duesPayments)
    .where(
      and(
        eq(duesPayments.councilYear, councilYear),
        eq(duesPayments.status, 'completed'),
      ),
    );

  return new Set(rows.map(row => row.membershipNumber));
};

export const getMemberPaymentStatus = async (
  membershipNumber: string,
): Promise<{
  amountCents: null | number;
  councilYear: null | string;
  paid: boolean;
  payment: null | typeof duesPayments.$inferSelect;
}> => {
  const dues = await getMemberDuesAmount(membershipNumber);
  const councilYear = dues?.councilYear ?? (await getCurrentCouncilYear());

  if (!councilYear) {
    return {
      amountCents: dues?.amountCents ?? null,
      councilYear: null,
      paid: false,
      payment: null,
    };
  }

  const payment = await db.query.duesPayments.findFirst({
    where: and(
      eq(duesPayments.membershipNumber, membershipNumber),
      eq(duesPayments.councilYear, councilYear),
      eq(duesPayments.status, 'completed'),
    ),
  });

  return {
    amountCents: dues?.amountCents ?? null,
    councilYear,
    paid: Boolean(payment),
    payment: payment ?? null,
  };
};

export const getMemberSubscription = async (
  membershipNumber: string,
): Promise<null | typeof duesSubscriptions.$inferSelect> => {
  const rows = await db
    .select()
    .from(duesSubscriptions)
    .where(eq(duesSubscriptions.membershipNumber, membershipNumber));

  if (rows.length === 0) {
    return null;
  }

  const active = rows.find(row => row.status === 'active');
  if (active) {
    return active;
  }

  return (
    rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]
    ?? null
  );
};

export const getPaypalBusinessEmail = (): null | string => {
  const fromConfig = loadCouncilConfig().dues?.paypalBusinessEmail?.trim();
  if (fromConfig) {
    return fromConfig;
  }

  return process.env.PAYPAL_BUSINESS_EMAIL?.trim() || null;
};

export const isPayPalConfigured = (): boolean =>
  getPaypalBusinessEmail() !== null;

export const isPayPalSubscribeConfigured = (): boolean =>
  isPaypalSubscriptionsReady();

export const isPayPalRestEnvConfigured = (): boolean =>
  isPaypalRestConfigured();

/**
Council year + at least one dues rate — portal Dues visible when true.
*/
export const isDuesConfigured = async (): Promise<boolean> => {
  const councilYear = await getCurrentCouncilYear();
  if (!councilYear) {
    return false;
  }

  const rates = await db
    .select({ memberClass: duesRates.memberClass })
    .from(duesRates)
    .limit(1);
  return rates.length > 0;
};

export const canManageDuesAdmin = async (
  membershipNumber: string,
): Promise<boolean> => {
  const { hasPermission } = await import('@/lib/permissions-sync');
  const { isFinancialSecretary } = await import('@/lib/officers');
  return (
    (await hasPermission(membershipNumber, 'manageDues'))
    || (await isFinancialSecretary(membershipNumber))
  );
};

export const recordPaypalPayment = async (options: {
  amountCents: number;
  councilYear: string;
  memberClass: string;
  membershipNumber: string;
  payerEmail?: string;
  paypalSubscriptionId?: string;
  paypalTxnId: string;
  source?: 'paypal_ipn' | 'paypal_subscription';
}): Promise<boolean> => {
  const existing = await db.query.duesPayments.findFirst({
    where: eq(duesPayments.paypalTxnId, options.paypalTxnId),
  });

  if (existing) {
    return false;
  }

  const alreadyPaid = await db.query.duesPayments.findFirst({
    where: and(
      eq(duesPayments.membershipNumber, options.membershipNumber),
      eq(duesPayments.councilYear, options.councilYear),
      eq(duesPayments.status, 'completed'),
    ),
  });

  if (alreadyPaid) {
    return false;
  }

  const now = new Date();
  const { createId } = await import('@/lib/utils');
  const source = options.source ?? 'paypal_ipn';

  await db.insert(duesPayments).values({
    amountCents: options.amountCents,
    councilYear: options.councilYear,
    createdAt: now,
    id: createId(),
    memberClass: options.memberClass,
    membershipNumber: options.membershipNumber,
    method: 'paypal',
    paidAt: now,
    payerEmail: options.payerEmail ?? null,
    paypalSubscriptionId: options.paypalSubscriptionId ?? null,
    paypalTxnId: options.paypalTxnId,
    source,
    status: 'completed',
  });

  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    action:
      source === 'paypal_subscription'
        ? 'dues.paypal_subscription_payment'
        : 'dues.paypal_ipn',
    actorMembershipNumber: null,
    metadata: {
      amountCents: options.amountCents,
      councilYear: options.councilYear,
      membershipNumber: options.membershipNumber,
      paypalSubscriptionId: options.paypalSubscriptionId ?? null,
    },
    summary: `PayPal dues payment for ${options.membershipNumber} (${options.councilYear})`,
  });

  return true;
};

export const upsertDuesSubscription = async (options: {
  amountCents: number;
  lastPaymentAt?: Date | null;
  memberClass: string;
  membershipNumber: string;
  nextBillingAt?: Date | null;
  payerEmail?: null | string;
  paypalPlanId: string;
  paypalSubscriptionId: string;
  status:
    | 'active'
    | 'approval_pending'
    | 'approved'
    | 'cancelled'
    | 'expired'
    | 'suspended';
}): Promise<void> => {
  const now = new Date();
  const existing = await db.query.duesSubscriptions.findFirst({
    where: eq(
      duesSubscriptions.paypalSubscriptionId,
      options.paypalSubscriptionId,
    ),
  });

  if (existing) {
    await db
      .update(duesSubscriptions)
      .set({
        amountCents: options.amountCents,
        lastPaymentAt:
          options.lastPaymentAt === undefined
            ? existing.lastPaymentAt
            : options.lastPaymentAt,
        lastSyncedAt: now,
        memberClass: options.memberClass,
        nextBillingAt:
          options.nextBillingAt === undefined
            ? existing.nextBillingAt
            : options.nextBillingAt,
        payerEmail: options.payerEmail ?? existing.payerEmail,
        paypalPlanId: options.paypalPlanId,
        status: options.status,
        updatedAt: now,
      })
      .where(eq(duesSubscriptions.id, existing.id));
    return;
  }

  // Prefer one active row per member: demote older actives when activating a new one.
  if (options.status === 'active') {
    await db
      .update(duesSubscriptions)
      .set({ status: 'cancelled', updatedAt: now })
      .where(
        and(
          eq(duesSubscriptions.membershipNumber, options.membershipNumber),
          eq(duesSubscriptions.status, 'active'),
          ne(
            duesSubscriptions.paypalSubscriptionId,
            options.paypalSubscriptionId,
          ),
        ),
      );
  }

  const { createId } = await import('@/lib/utils');
  await db.insert(duesSubscriptions).values({
    amountCents: options.amountCents,
    createdAt: now,
    id: createId(),
    lastPaymentAt: options.lastPaymentAt ?? null,
    lastSyncedAt: now,
    memberClass: options.memberClass,
    membershipNumber: options.membershipNumber,
    nextBillingAt: options.nextBillingAt ?? null,
    payerEmail: options.payerEmail ?? null,
    paypalPlanId: options.paypalPlanId,
    paypalSubscriptionId: options.paypalSubscriptionId,
    status: options.status,
    updatedAt: now,
  });
};

export const getPlanIdForMember = async (
  membershipNumber: string,
): Promise<null | {
  dues: NonNullable<Awaited<ReturnType<typeof getMemberDuesAmount>>>;
  planId: string;
}> => {
  const dues = await getMemberDuesAmount(membershipNumber);
  if (!dues) {
    return null;
  }

  const planId = getPaypalPlanIdForClass(dues.memberClass);
  if (!planId) {
    return null;
  }

  return { dues, planId };
};

export const recordManualPayment = async (options: {
  amountCents: number;
  councilYear: string;
  markedByMembershipNumber: string;
  memberClass: string;
  membershipNumber: string;
  method: 'cash' | 'check' | 'other' | 'paypal';
  notes?: string;
}): Promise<void> => {
  const existing = await db.query.duesPayments.findFirst({
    where: and(
      eq(duesPayments.membershipNumber, options.membershipNumber),
      eq(duesPayments.councilYear, options.councilYear),
      eq(duesPayments.status, 'completed'),
    ),
  });

  if (existing) {
    throw new Error('Dues already marked paid for this council year');
  }

  const now = new Date();
  const { createId } = await import('@/lib/utils');

  await db.insert(duesPayments).values({
    amountCents: options.amountCents,
    councilYear: options.councilYear,
    createdAt: now,
    id: createId(),
    markedByMembershipNumber: options.markedByMembershipNumber,
    memberClass: options.memberClass,
    membershipNumber: options.membershipNumber,
    method: options.method,
    notes: options.notes ?? null,
    paidAt: now,
    source: 'manual',
    status: 'completed',
  });

  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    action: 'dues.manual_payment',
    actorMembershipNumber: options.markedByMembershipNumber,
    metadata: {
      amountCents: options.amountCents,
      councilYear: options.councilYear,
      membershipNumber: options.membershipNumber,
      method: options.method,
    },
    summary: `Marked dues paid for ${options.membershipNumber} (${options.councilYear}, ${options.method})`,
  });
};
