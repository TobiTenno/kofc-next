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
  getPaypalSubSyncIntervalMs,
  isPaypalRestConfigured,
  mapPaypalStatusToLocal,
} from '@/lib/paypal';
import { getCurrentCouncilYear } from '@/lib/permissions-sync';

export type PaypalSubscriptionSyncResult = {
  checked: number;
  errors: number;
  paymentsRecorded: number;
  updated: number;
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
): Promise<{ paymentRecorded: boolean; updated: boolean }> => {
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
    amountCents: row.amountCents,
    lastPaymentAt,
    memberClass: row.memberClass,
    membershipNumber: row.membershipNumber,
    nextBillingAt,
    payerEmail,
    paypalPlanId: details.plan_id ?? row.paypalPlanId,
    paypalSubscriptionId: row.paypalSubscriptionId,
    status,
  });

  let paymentRecorded = false;
  const lastPaymentValue = details.billing_info?.last_payment?.amount?.value;
  const lastPaymentTime = details.billing_info?.last_payment?.time;

  if (lastPaymentValue && lastPaymentTime && status === 'active') {
    const dues = await getMemberDuesAmount(row.membershipNumber);
    const councilYear
      = dues?.councilYear ?? (await getCurrentCouncilYear()) ?? null;

    if (dues && councilYear) {
      // Synthetic but stable txn id when PayPal billing_info lacks sale id.
      const paypalTxnId = `sub:${row.paypalSubscriptionId}:${lastPaymentTime}`;
      paymentRecorded = await recordPaypalPayment({
        amountCents: dues.amountCents,
        councilYear,
        memberClass: dues.memberClass,
        membershipNumber: row.membershipNumber,
        payerEmail: payerEmail ?? undefined,
        paypalSubscriptionId: row.paypalSubscriptionId,
        paypalTxnId,
        source: 'paypal_subscription',
      });
    }
  }

  return { paymentRecorded, updated: true };
};

export const syncPaypalSubscriptions
  = async (): Promise<PaypalSubscriptionSyncResult> => {
    if (!isPaypalRestConfigured()) {
      return { checked: 0, errors: 0, paymentsRecorded: 0, updated: 0 };
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
      }
      catch (error) {
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
      }
      catch {
        // Ignore terminal refresh failures.
      }
    }

    await recordAuditEvent({
      action: 'dues.paypal_subscription_sync',
      actorMembershipNumber: null,
      metadata: {
        checked: rows.length,
        errors,
        paymentsRecorded,
        updated,
      },
      summary: `Synced ${updated}/${rows.length} PayPal subscriptions (${paymentsRecorded} payments, ${errors} errors)`,
    });

    return {
      checked: rows.length,
      errors,
      paymentsRecorded,
      updated,
    };
  };

let syncTimer: null | ReturnType<typeof setInterval> = null;
let syncRunning = false;

export const runPaypalSubscriptionSyncSafe = async (): Promise<void> => {
  if (syncRunning || !isPaypalRestConfigured()) {
    return;
  }

  syncRunning = true;
  try {
    await syncPaypalSubscriptions();
  }
  catch (error) {
    console.error('PayPal subscription sync crashed:', error);
  }
  finally {
    syncRunning = false;
  }
};

export const startPaypalSubscriptionSyncScheduler = (): void => {
  if (syncTimer) {
    return;
  }

  const TICK_MS = 60_000;
  let lastRunAt = 0;

  // Delay first tick so startup migrations settle.
  setTimeout(() => {
    lastRunAt = Date.now();
    void runPaypalSubscriptionSyncSafe();
  }, 15_000);

  syncTimer = setInterval(() => {
    const intervalMs = getPaypalSubSyncIntervalMs();
    if (Date.now() - lastRunAt < intervalMs) {
      return;
    }
    lastRunAt = Date.now();
    void runPaypalSubscriptionSyncSafe();
  }, TICK_MS);

  if (typeof syncTimer.unref === 'function') {
    syncTimer.unref();
  }
};

export const findSubscriptionByPaypalId = async (
  paypalSubscriptionId: string,
): Promise<null | typeof duesSubscriptions.$inferSelect> =>
  (await db.query.duesSubscriptions.findFirst({
    where: eq(duesSubscriptions.paypalSubscriptionId, paypalSubscriptionId),
  })) ?? null;
