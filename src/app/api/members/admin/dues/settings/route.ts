import { NextResponse } from 'next/server';

import { recordAuditEvent } from '@/lib/audit';
import { loadCouncilConfig, writeCouncilConfig } from '@/lib/council-config';
import {
  clearPaypalTokenCache,
  getPaypalPublicSettings,
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
  const councilYear
    = dues?.councilYear ?? (await getCurrentCouncilYear()) ?? '';
  const paypal = getPaypalPublicSettings();

  return NextResponse.json({
    paypal: {
      mode: paypal.mode,
      restConfigured: paypal.restConfigured,
      subscriptionsReady: paypal.subscriptionsReady,
    },
    settings: {
      councilYear,
      currency: dues?.currency ?? 'USD',
      paypalBusinessEmail: dues?.paypalBusinessEmail ?? '',
      paypalClientId: paypal.clientId,
      paypalClientSecretMasked: paypal.clientSecretMasked,
      paypalMode: paypal.mode,
      paypalPlans: dues?.paypalPlans ?? {},
      paypalProductId: dues?.paypalProductId ?? '',
      paypalSubSyncIntervalMs: paypal.subSyncIntervalMs,
      paypalWebhookIdMasked: paypal.webhookIdMasked,
      rates: dues?.rates ?? {},
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
    paypalClientId?: string;
    paypalClientSecret?: string;
    paypalMode?: string;
    paypalSubSyncIntervalMs?: number | string;
    paypalWebhookId?: string;
    rates?: Record<string, number>;
  };

  const councilYear = body.councilYear?.trim() ?? '';
  const paypalBusinessEmail = body.paypalBusinessEmail?.trim() ?? '';
  const currency = body.currency?.trim() || 'USD';
  const rates = body.rates ?? {};
  const paypalClientId = body.paypalClientId?.trim() ?? '';
  const paypalClientSecret = body.paypalClientSecret?.trim() ?? '';
  const paypalWebhookId = body.paypalWebhookId?.trim() ?? '';
  const paypalModeRaw = body.paypalMode?.trim().toLowerCase();
  const paypalMode
    = paypalModeRaw === 'live' || paypalModeRaw === 'sandbox'
      ? paypalModeRaw
      : undefined;

  const syncIntervalRaw = Number(body.paypalSubSyncIntervalMs);
  const paypalSubSyncIntervalMs
    = Number.isFinite(syncIntervalRaw) && syncIntervalRaw >= 60_000
      ? Math.floor(syncIntervalRaw)
      : undefined;

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
  const previous = config.dues;
  const previousPlans = previous?.paypalPlans ?? {};
  const previousProductId = previous?.paypalProductId;

  const nextClientId = paypalClientId || undefined;
  const nextClientSecret = paypalClientSecret || previous?.paypalClientSecret;
  const nextWebhookId = paypalWebhookId || previous?.paypalWebhookId;
  const nextMode = paypalMode ?? previous?.paypalMode ?? 'sandbox';
  const nextSyncInterval
    = paypalSubSyncIntervalMs ?? previous?.paypalSubSyncIntervalMs ?? 3_600_000;

  const credentialsChanged
    = nextClientId !== previous?.paypalClientId
      || nextClientSecret !== previous?.paypalClientSecret
      || nextMode !== previous?.paypalMode;

  writeCouncilConfig({
    ...config,
    dues: {
      councilYear,
      currency,
      paypalBusinessEmail,
      paypalClientId: nextClientId,
      paypalClientSecret: nextClientSecret,
      paypalMode: nextMode,
      paypalPlans: previousPlans,
      paypalProductId: previousProductId,
      paypalSubSyncIntervalMs: nextSyncInterval,
      paypalWebhookId: nextWebhookId,
      rates: cleanedRates,
    },
  });

  if (credentialsChanged) {
    clearPaypalTokenCache();
  }

  await syncDuesFromJson();

  let paypalPlans = previousPlans;
  let paypalProductId = previousProductId ?? '';
  let planSyncError: null | string = null;

  if (isPaypalRestConfigured()) {
    try {
      const synced = await syncPaypalPlansForRates({
        currency,
        existingPlans: previousPlans,
        existingProductId: previousProductId,
        rates: cleanedRates,
      });
      paypalProductId = synced.productId;
      paypalPlans = synced.plans;
      persistPaypalPlans({
        plans: paypalPlans,
        productId: paypalProductId,
      });
    }
    catch (error) {
      planSyncError
        = error instanceof Error ? error.message : 'PayPal plan sync failed';
    }
  }

  await recordAuditEvent({
    action: 'dues.settings.update',
    actorMembershipNumber: membershipNumber,
    metadata: {
      councilYear,
      paypalMode: nextMode ?? getPaypalPublicSettings().mode,
      paypalPlanCount: Object.keys(paypalPlans).length,
      planSyncError,
      rateCount: Object.keys(cleanedRates).length,
      restConfigured: isPaypalRestConfigured(),
    },
    summary: `Updated dues settings (${councilYear}, ${Object.keys(cleanedRates).length} rates)`,
  });

  const paypal = getPaypalPublicSettings();

  return NextResponse.json({
    paypal: {
      mode: paypal.mode,
      restConfigured: paypal.restConfigured,
      subscriptionsReady: paypal.subscriptionsReady,
    },
    planSyncError,
    settings: {
      councilYear,
      currency,
      paypalBusinessEmail,
      paypalClientId: paypal.clientId,
      paypalClientSecretMasked: paypal.clientSecretMasked,
      paypalMode: paypal.mode,
      paypalPlans,
      paypalProductId,
      paypalSubSyncIntervalMs: paypal.subSyncIntervalMs,
      paypalWebhookIdMasked: paypal.webhookIdMasked,
      rates: cleanedRates,
    },
  });
};
