import { NextResponse } from 'next/server';
import { recordAuditEvent } from '@/lib/audit';
import { loadCouncilConfig, writeCouncilConfig } from '@/lib/council-config';
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
  writeCouncilConfig({
    ...config,
    dues: {
      councilYear,
      currency,
      paypalBusinessEmail,
      rates: cleanedRates,
    },
  });

  await syncDuesFromJson();

  await recordAuditEvent({
    actorMembershipNumber: membershipNumber,
    action: 'dues.settings.update',
    summary: `Updated dues settings (${councilYear}, ${Object.keys(cleanedRates).length} rates)`,
    metadata: {
      councilYear,
      rateCount: Object.keys(cleanedRates).length,
    },
  });

  return NextResponse.json({
    settings: {
      councilYear,
      currency,
      paypalBusinessEmail,
      rates: cleanedRates,
    },
  });
};
