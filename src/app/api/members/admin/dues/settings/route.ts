import { NextResponse } from 'next/server';
import { recordAuditEvent } from '@/lib/audit';
import { loadCouncilConfig, writeCouncilConfig } from '@/lib/council-config';
import {
  isPayPalRestEnvConfigured,
  isPayPalSubscribeConfigured,
} from '@/lib/dues';
import {
  getPaypalMode,
  isPaypalRestConfigured,
  persistPaypalPlans,
  syncPaypalPlansForRates,
} from '@/lib/paypal';
import {
  getCurrentCouncilYear,
  hasPermission,
  syncDuesFromJson,
} from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';

export const GET = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageDues'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const config = loadCouncilConfig();
  const dues = config.dues;
  const councilYear =
    dues?.councilYear ?? (await getCurrentCouncilYear()) ?? '';

  return NextResponse.json({
    settings: {
      councilYear,
      currency: dues?.currency ?? 'USD',
      paypalBusinessEmail: dues?.paypalBusinessEmail ?? '',
      rates: dues?.rates ?? {},
      paypalProductId: dues?.paypalProductId ?? '',
      paypalPlans: dues?.paypalPlans ?? {},
    },
    paypal: {
      restConfigured: isPayPalRestEnvConfigured(),
      subscriptionsReady: isPayPalSubscribeConfigured(),
      mode: getPaypalMode(),
    },
  });
};

export const PUT = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageDues'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    councilYear?: string;
    currency?: string;
    paypalBusinessEmail?: string;
    rates?: Record<string, number>;
  };

  const councilYear = body.councilYear?.trim() ?? '';
  const paypalBusinessEmail = body.paypalBusinessEmail?.trim() ?? '';
  const currency = body.currency?.trim() || 'USD';
  const rates = body.rates ?? {};

  if (!councilYear) {
    return NextResponse.json(
      { error: 'Council year is required' },
      { status: 400 },
    );
  }

  if (!paypalBusinessEmail?.includes('@')) {
    return NextResponse.json(
      { error: 'Valid PayPal business email is required' },
      { status: 400 },
    );
  }

  const cleanedRates: Record<string, number> = {};
  for (const [memberClass, amountCents] of Object.entries(rates)) {
    const key = memberClass.trim();
    const amount = Number(amountCents);
    if (!key || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: `Invalid rate for class "${memberClass}"` },
        { status: 400 },
      );
    }
    cleanedRates[key] = amount;
  }

  if (Object.keys(cleanedRates).length === 0) {
    return NextResponse.json(
      { error: 'Add at least one dues rate' },
      { status: 400 },
    );
  }

  const config = loadCouncilConfig();
  const previousPlans = config.dues?.paypalPlans ?? {};
  const previousProductId = config.dues?.paypalProductId;

  writeCouncilConfig({
    ...config,
    dues: {
      councilYear,
      currency,
      paypalBusinessEmail,
      rates: cleanedRates,
      paypalProductId: previousProductId,
      paypalPlans: previousPlans,
    },
  });

  await syncDuesFromJson();

  let paypalPlans = previousPlans;
  let paypalProductId = previousProductId ?? '';
  let planSyncError: string | null = null;

  if (isPaypalRestConfigured()) {
    try {
      const synced = await syncPaypalPlansForRates({
        rates: cleanedRates,
        currency,
        existingPlans: previousPlans,
        existingProductId: previousProductId,
      });
      paypalProductId = synced.productId;
      paypalPlans = synced.plans;
      persistPaypalPlans({
        productId: paypalProductId,
        plans: paypalPlans,
      });
    } catch (error) {
      planSyncError =
        error instanceof Error ? error.message : 'PayPal plan sync failed';
    }
  }

  await recordAuditEvent({
    actorMembershipNumber: membershipNumber,
    action: 'dues.settings.update',
    summary: `Updated dues settings (${councilYear}, ${Object.keys(cleanedRates).length} rates)`,
    metadata: {
      councilYear,
      rateCount: Object.keys(cleanedRates).length,
      paypalPlanCount: Object.keys(paypalPlans).length,
      planSyncError,
    },
  });

  return NextResponse.json({
    settings: {
      councilYear,
      currency,
      paypalBusinessEmail,
      rates: cleanedRates,
      paypalProductId,
      paypalPlans,
    },
    paypal: {
      restConfigured: isPayPalRestEnvConfigured(),
      subscriptionsReady: isPayPalSubscribeConfigured(),
      mode: getPaypalMode(),
    },
    planSyncError,
  });
};
