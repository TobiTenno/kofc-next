import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { duesPayments, duesRates, members } from '@/db/schema';
import { loadCouncilConfig } from '@/lib/council-config';
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

export const getPaypalBusinessEmail = (): string | null => {
  const fromEnv = process.env.PAYPAL_BUSINESS_EMAIL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return loadCouncilConfig().dues?.paypalBusinessEmail?.trim() ?? null;
};

export const isPayPalConfigured = (): boolean =>
  getPaypalBusinessEmail() !== null;

export const recordPaypalPayment = async (options: {
  membershipNumber: string;
  councilYear: string;
  amountCents: number;
  memberClass: string;
  paypalTxnId: string;
  payerEmail?: string;
}): Promise<boolean> => {
  const existing = await db.query.duesPayments.findFirst({
    where: eq(duesPayments.paypalTxnId, options.paypalTxnId),
  });

  if (existing) {
    return false;
  }

  const now = new Date();
  const { createId } = await import('@/lib/utils');

  await db.insert(duesPayments).values({
    id: createId(),
    membershipNumber: options.membershipNumber,
    memberClass: options.memberClass,
    amountCents: options.amountCents,
    councilYear: options.councilYear,
    source: 'paypal_ipn',
    status: 'completed',
    paypalTxnId: options.paypalTxnId,
    payerEmail: options.payerEmail ?? null,
    method: 'paypal',
    paidAt: now,
    createdAt: now,
  });

  return true;
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
};
