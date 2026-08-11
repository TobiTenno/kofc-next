import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { duesSubscriptions } from '@/db/schema';
import { recordAuditEvent } from '@/lib/audit';
import {
  getMemberDuesAmount,
  recordPaypalPayment,
  upsertDuesSubscription,
} from '@/lib/dues';
import {
  getPaypalSubscription,
  isPaypalRestConfigured,
  mapPaypalStatusToLocal,
} from '@/lib/paypal';
import { getCurrentCouncilYear } from '@/lib/permissions-sync';

export type PaypalSubscriptionSyncResult = {
  checked: number;
  updated: number;
  paymentsRecorded: number;
  errors: number;
};

const parseBillingTime = (value: string | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const syncOneSubscription = async (
  row: typeof duesSubscriptions.$inferSelect,
): Promise<{ updated: boolean; paymentRecorded: boolean }> => {
  const details = await getPaypalSubscription(row.paypalSubscriptionId);
  const status = mapPaypalStatusToLocal(details.status);
  const nextBillingAt = parseBillingTime(
    details.billing_info?.next_billing_time,
  );
  const lastPaymentAt = parseBillingTime(
    details.billing_info?.last_payment?.time,
  );
  const payerEmail = details.subscriber?.email_address ?? row.payerEmail;

  await upsertDuesSubscription({
    membershipNumber: row.membershipNumber,
    paypalSubscriptionId: row.paypalSubscriptionId,
    paypalPlanId: details.plan_id ?? row.paypalPlanId,
    status,
    memberClass: row.memberClass,
    amountCents: row.amountCents,
    payerEmail,
    nextBillingAt,
    lastPaymentAt,
  });

  let paymentRecorded = false;
  const lastPaymentValue = details.billing_info?.last_payment?.amount?.value;
  const lastPaymentTime = details.billing_info?.last_payment?.time;

  if (lastPaymentValue && lastPaymentTime && status === 'active') {
    const dues = await getMemberDuesAmount(row.membershipNumber);
    const councilYear =
      dues?.councilYear ?? (await getCurrentCouncilYear()) ?? null;

    if (dues && councilYear) {
      // Synthetic but stable txn id when PayPal billing_info lacks sale id.
      const paypalTxnId = `sub:${row.paypalSubscriptionId}:${lastPaymentTime}`;
      paymentRecorded = await recordPaypalPayment({
        membershipNumber: row.membershipNumber,
        councilYear,
        amountCents: dues.amountCents,
        memberClass: dues.memberClass,
        paypalTxnId,
        payerEmail: payerEmail ?? undefined,
        source: 'paypal_subscription',
        paypalSubscriptionId: row.paypalSubscriptionId,
      });
    }
  }

  return { updated: true, paymentRecorded };
};

export const syncPaypalSubscriptions =
  async (): Promise<PaypalSubscriptionSyncResult> => {
    if (!isPaypalRestConfigured()) {
      return { checked: 0, updated: 0, paymentsRecorded: 0, errors: 0 };
    }

    const rows = await db
      .select()
      .from(duesSubscriptions)
      .where(
        inArray(duesSubscriptions.status, [
          'approval_pending',
          'approved',
          'active',
          'suspended',
        ]),
      );

    let updated = 0;
    let paymentsRecorded = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const result = await syncOneSubscription(row);
        if (result.updated) {
          updated += 1;
        }
        if (result.paymentRecorded) {
          paymentsRecorded += 1;
        }
      } catch (error) {
        errors += 1;
        console.error(
          `PayPal subscription sync failed for ${row.paypalSubscriptionId}:`,
          error,
        );
      }
    }

    // Also refresh recently cancelled/expired once so nextBillingAt clears.
    const terminal = await db
      .select()
      .from(duesSubscriptions)
      .where(inArray(duesSubscriptions.status, ['cancelled', 'expired']));

    for (const row of terminal.slice(0, 20)) {
      try {
        await syncOneSubscription(row);
        updated += 1;
      } catch {
        // Ignore terminal refresh failures.
      }
    }

    await recordAuditEvent({
      actorMembershipNumber: null,
      action: 'dues.paypal_subscription_sync',
      summary: `Synced ${updated}/${rows.length} PayPal subscriptions (${paymentsRecorded} payments, ${errors} errors)`,
      metadata: {
        checked: rows.length,
        updated,
        paymentsRecorded,
        errors,
      },
    });

    return {
      checked: rows.length,
      updated,
      paymentsRecorded,
      errors,
    };
  };

let syncTimer: ReturnType<typeof setInterval> | null = null;
let syncRunning = false;

export const runPaypalSubscriptionSyncSafe = async (): Promise<void> => {
  if (syncRunning || !isPaypalRestConfigured()) {
    return;
  }

  syncRunning = true;
  try {
    await syncPaypalSubscriptions();
  } catch (error) {
    console.error('PayPal subscription sync crashed:', error);
  } finally {
    syncRunning = false;
  }
};

export const startPaypalSubscriptionSyncScheduler = (
  intervalMs: number,
): void => {
  if (syncTimer || !isPaypalRestConfigured()) {
    return;
  }

  // Delay first tick so startup migrations settle.
  setTimeout(() => {
    void runPaypalSubscriptionSyncSafe();
  }, 15_000);

  syncTimer = setInterval(() => {
    void runPaypalSubscriptionSyncSafe();
  }, intervalMs);

  if (typeof syncTimer.unref === 'function') {
    syncTimer.unref();
  }
};

export const findSubscriptionByPaypalId = async (
  paypalSubscriptionId: string,
): Promise<typeof duesSubscriptions.$inferSelect | null> =>
  (await db.query.duesSubscriptions.findFirst({
    where: eq(duesSubscriptions.paypalSubscriptionId, paypalSubscriptionId),
  })) ?? null;
