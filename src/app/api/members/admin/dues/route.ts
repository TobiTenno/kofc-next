import { eq, like, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { members } from '@/db/schema';
import {
  getMemberDuesAmount,
  getMemberPaymentStatus,
  recordManualPayment,
} from '@/lib/dues';
import { isFinancialSecretary } from '@/lib/officers';
import { getMembershipNumber } from '@/lib/session';

export const GET = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isFinancialSecretary(membershipNumber))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get('q')?.trim();
  if (!query) {
    return NextResponse.json({ members: [] });
  }

  const rows = await db
    .select()
    .from(members)
    .where(
      or(
        eq(members.membershipNumber, query),
        like(members.firstName, `%${query}%`),
        like(members.lastName, `%${query}%`),
      ),
    )
    .limit(20);

  const enriched = await Promise.all(
    rows.map(async (member) => ({
      member,
      dues: await getMemberDuesAmount(member.membershipNumber),
      status: await getMemberPaymentStatus(member.membershipNumber),
    })),
  );

  return NextResponse.json({ members: enriched });
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isFinancialSecretary(membershipNumber))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    membershipNumber?: string;
    method?: 'cash' | 'check' | 'paypal' | 'other';
    notes?: string;
  };

  if (!body.membershipNumber || !body.method) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const dues = await getMemberDuesAmount(body.membershipNumber);
  if (!dues) {
    return NextResponse.json(
      { error: 'Unable to resolve dues' },
      { status: 400 },
    );
  }

  try {
    await recordManualPayment({
      membershipNumber: body.membershipNumber,
      memberClass: dues.memberClass,
      amountCents: dues.amountCents,
      councilYear: dues.councilYear,
      method: body.method,
      notes: body.notes,
      markedByMembershipNumber: membershipNumber,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
};
