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
): Promise<{
  amountCents: number;
  memberClass: string;
  councilYear: string;
} | null> => {
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
    memberClass: member.memberClass,
    councilYear: rate.councilYear ?? councilYear,
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

  return new Set(rows.map((row) => row.membershipNumber));
};

export const getMemberPaymentStatus = async (
  membershipNumber: string,
): Promise<{
  paid: boolean;
  payment: typeof duesPayments.$inferSelect | null;
  amountCents: number | null;
  councilYear: string | null;
}> => {
  const dues = await getMemberDuesAmount(membershipNumber);
  const councilYear = dues?.councilYear ?? (await getCurrentCouncilYear());

  if (!councilYear) {
    return {
      paid: false,
      payment: null,
      amountCents: dues?.amountCents ?? null,
      councilYear: null,
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
    paid: Boolean(payment),
    payment: payment ?? null,
    amountCents: dues?.amountCents ?? null,
    councilYear,
  };
};

export const getMemberSubscription = async (
  membershipNumber: string,
): Promise<typeof duesSubscriptions.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(duesSubscriptions)
    .where(eq(duesSubscriptions.membershipNumber, membershipNumber));

  if (rows.length === 0) {
    return null;
  }

  const active = rows.find((row) => row.status === 'active');
  if (active) {
    return active;
  }

  return (
    rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ??
    null
  );
};

export const getPaypalBusinessEmail = (): string | null => {
  const fromEnv = process.env.PAYPAL_BUSINESS_EMAIL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return loadCouncilConfig().dues?.paypalBusinessEmail?.trim() ?? null;
};

export const isPayPalConfigured = (): boolean =>
  getPaypalBusinessEmail() !== null;

export const isPayPalSubscribeConfigured = (): boolean =>
  isPaypalSubscriptionsReady();

export const isPayPalRestEnvConfigured = (): boolean =>
  isPaypalRestConfigured();

/** Council year + at least one dues rate — portal Dues visible when true. */
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
    (await hasPermission(membershipNumber, 'manageDues')) ||
    (await isFinancialSecretary(membershipNumber))
  );
};

export const recordPaypalPayment = async (options: {
  membershipNumber: string;
  councilYear: string;
  amountCents: number;
  memberClass: string;
  paypalTxnId: string;
  payerEmail?: string;
  source?: 'paypal_ipn' | 'paypal_subscription';
  paypalSubscriptionId?: string;
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
    id: createId(),
    membershipNumber: options.membershipNumber,
    memberClass: options.memberClass,
    amountCents: options.amountCents,
    councilYear: options.councilYear,
    source,
    status: 'completed',
    paypalTxnId: options.paypalTxnId,
    paypalSubscriptionId: options.paypalSubscriptionId ?? null,
    payerEmail: options.payerEmail ?? null,
    method: 'paypal',
    paidAt: now,
    createdAt: now,
  });

  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    actorMembershipNumber: null,
    action:
      source === 'paypal_subscription'
        ? 'dues.paypal_subscription_payment'
        : 'dues.paypal_ipn',
    summary: `PayPal dues payment for ${options.membershipNumber} (${options.councilYear})`,
    metadata: {
      membershipNumber: options.membershipNumber,
      councilYear: options.councilYear,
      amountCents: options.amountCents,
      paypalSubscriptionId: options.paypalSubscriptionId ?? null,
    },
  });

  return true;
};

export const upsertDuesSubscription = async (options: {
  membershipNumber: string;
  paypalSubscriptionId: string;
  paypalPlanId: string;
  status:
    | 'approval_pending'
    | 'approved'
    | 'active'
    | 'suspended'
    | 'cancelled'
    | 'expired';
  memberClass: string;
  amountCents: number;
  payerEmail?: string | null;
  nextBillingAt?: Date | null;
  lastPaymentAt?: Date | null;
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
        status: options.status,
        paypalPlanId: options.paypalPlanId,
        memberClass: options.memberClass,
        amountCents: options.amountCents,
        payerEmail: options.payerEmail ?? existing.payerEmail,
        nextBillingAt:
          options.nextBillingAt === undefined
            ? existing.nextBillingAt
            : options.nextBillingAt,
        lastPaymentAt:
          options.lastPaymentAt === undefined
            ? existing.lastPaymentAt
            : options.lastPaymentAt,
        lastSyncedAt: now,
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
    id: createId(),
    membershipNumber: options.membershipNumber,
    paypalSubscriptionId: options.paypalSubscriptionId,
    paypalPlanId: options.paypalPlanId,
    status: options.status,
    memberClass: options.memberClass,
    amountCents: options.amountCents,
    payerEmail: options.payerEmail ?? null,
    nextBillingAt: options.nextBillingAt ?? null,
    lastPaymentAt: options.lastPaymentAt ?? null,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  });
};

export const getPlanIdForMember = async (
  membershipNumber: string,
): Promise<{
  planId: string;
  dues: NonNullable<Awaited<ReturnType<typeof getMemberDuesAmount>>>;
} | null> => {
  const dues = await getMemberDuesAmount(membershipNumber);
  if (!dues) {
    return null;
  }

  const planId = getPaypalPlanIdForClass(dues.memberClass);
  if (!planId) {
    return null;
  }

  return { planId, dues };
};

export const recordManualPayment = async (options: {
  membershipNumber: string;
  memberClass: string;
  amountCents: number;
  councilYear: string;
  method: 'cash' | 'check' | 'paypal' | 'other';
  notes?: string;
  markedByMembershipNumber: string;
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
    id: createId(),
    membershipNumber: options.membershipNumber,
    memberClass: options.memberClass,
    amountCents: options.amountCents,
    councilYear: options.councilYear,
    source: 'manual',
    status: 'completed',
    method: options.method,
    notes: options.notes ?? null,
    markedByMembershipNumber: options.markedByMembershipNumber,
    paidAt: now,
    createdAt: now,
  });

  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    actorMembershipNumber: options.markedByMembershipNumber,
    action: 'dues.manual_payment',
    summary: `Marked dues paid for ${options.membershipNumber} (${options.councilYear}, ${options.method})`,
    metadata: {
      membershipNumber: options.membershipNumber,
      councilYear: options.councilYear,
      method: options.method,
      amountCents: options.amountCents,
    },
  });
};
