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
  const councilYear =
    dues?.councilYear ?? (await getCurrentCouncilYear()) ?? '';
  const paypal = getPaypalPublicSettings();

  return NextResponse.json({
    settings: {
      councilYear,
      currency: dues?.currency ?? 'USD',
      paypalBusinessEmail: dues?.paypalBusinessEmail ?? '',
      rates: dues?.rates ?? {},
      paypalProductId: dues?.paypalProductId ?? '',
      paypalPlans: dues?.paypalPlans ?? {},
      paypalClientId: paypal.clientId,
      paypalClientSecretMasked: paypal.clientSecretMasked,
      paypalMode: paypal.mode,
      paypalWebhookIdMasked: paypal.webhookIdMasked,
      paypalSubSyncIntervalMs: paypal.subSyncIntervalMs,
    },
    paypal: {
      restConfigured: paypal.restConfigured,
      subscriptionsReady: paypal.subscriptionsReady,
      mode: paypal.mode,
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
    paypalClientId?: string;
    paypalClientSecret?: string;
    paypalMode?: string;
    paypalWebhookId?: string;
    paypalSubSyncIntervalMs?: number | string;
  };

  const councilYear = body.councilYear?.trim() ?? '';
  const paypalBusinessEmail = body.paypalBusinessEmail?.trim() ?? '';
  const currency = body.currency?.trim() || 'USD';
  const rates = body.rates ?? {};
  const paypalClientId = body.paypalClientId?.trim() ?? '';
  const paypalClientSecret = body.paypalClientSecret?.trim() ?? '';
  const paypalWebhookId = body.paypalWebhookId?.trim() ?? '';
  const paypalModeRaw = body.paypalMode?.trim().toLowerCase();
  const paypalMode =
    paypalModeRaw === 'live' || paypalModeRaw === 'sandbox'
      ? paypalModeRaw
      : undefined;

  const syncIntervalRaw = Number(body.paypalSubSyncIntervalMs);
  const paypalSubSyncIntervalMs =
    Number.isFinite(syncIntervalRaw) && syncIntervalRaw >= 60_000
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
  const nextSyncInterval =
    paypalSubSyncIntervalMs ?? previous?.paypalSubSyncIntervalMs ?? 3_600_000;

  const credentialsChanged =
    nextClientId !== previous?.paypalClientId ||
    nextClientSecret !== previous?.paypalClientSecret ||
    nextMode !== previous?.paypalMode;

  writeCouncilConfig({
    ...config,
    dues: {
      councilYear,
      currency,
      paypalBusinessEmail,
      rates: cleanedRates,
      paypalProductId: previousProductId,
      paypalPlans: previousPlans,
      paypalClientId: nextClientId,
      paypalClientSecret: nextClientSecret,
      paypalMode: nextMode,
      paypalWebhookId: nextWebhookId,
      paypalSubSyncIntervalMs: nextSyncInterval,
    },
  });

  if (credentialsChanged) {
    clearPaypalTokenCache();
  }

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
      paypalMode: nextMode ?? getPaypalPublicSettings().mode,
      restConfigured: isPaypalRestConfigured(),
    },
  });

  const paypal = getPaypalPublicSettings();

  return NextResponse.json({
    settings: {
      councilYear,
      currency,
      paypalBusinessEmail,
      rates: cleanedRates,
      paypalProductId,
      paypalPlans,
      paypalClientId: paypal.clientId,
      paypalClientSecretMasked: paypal.clientSecretMasked,
      paypalMode: paypal.mode,
      paypalWebhookIdMasked: paypal.webhookIdMasked,
      paypalSubSyncIntervalMs: paypal.subSyncIntervalMs,
    },
    paypal: {
      restConfigured: paypal.restConfigured,
      subscriptionsReady: paypal.subscriptionsReady,
      mode: paypal.mode,
    },
    planSyncError,
  });
};
