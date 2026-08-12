import { and, eq, gt, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { members, registrationTokens } from '@/db/schema';
import { serverSignUpAuth } from '@/lib/auth';
import { sendRegistrationCode } from '@/lib/mailgun';
import {
  createId,
  formatMemberName,
  generateCode,
  normalizeEmail,
} from '@/lib/utils';

export const POST = async (request: Request): Promise<NextResponse> => {
  const body = (await request.json()) as {
    email?: string;
    membershipNumber?: string;
  };

  if (!body.membershipNumber || !body.email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const membershipNumber = body.membershipNumber.trim();
  const email = normalizeEmail(body.email);

  const member = await db.query.members.findFirst({
    where: and(
      eq(members.membershipNumber, membershipNumber),
      eq(members.active, true),
    ),
  });

  if (!member?.primaryEmail || normalizeEmail(member.primaryEmail) !== email) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(registrationTokens).values({
    code,
    email,
    expiresAt,
    id: createId(),
    membershipNumber,
  });

  try {
    await sendRegistrationCode({ code, to: email });
  }
  catch {
    return NextResponse.json(
      { error: 'Unable to send verification email' },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
};

export const completeRegistration = async (
  request: Request,
): Promise<NextResponse> => {
  const body = (await request.json()) as {
    code?: string;
    email?: string;
    membershipNumber?: string;
    password?: string;
  };

  if (!body.membershipNumber || !body.email || !body.code || !body.password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const membershipNumber = body.membershipNumber.trim();
  const email = normalizeEmail(body.email);
  const now = new Date();

  const token = await db.query.registrationTokens.findFirst({
    where: and(
      eq(registrationTokens.membershipNumber, membershipNumber),
      eq(registrationTokens.email, email),
      eq(registrationTokens.code, body.code),
      gt(registrationTokens.expiresAt, now),
      isNull(registrationTokens.usedAt),
    ),
  });

  if (!token) {
    return NextResponse.json(
      { error: 'Invalid or expired code' },
      { status: 400 },
    );
  }

  const member = await db.query.members.findFirst({
    where: eq(members.membershipNumber, membershipNumber),
  });

  if (!member?.active) {
    return NextResponse.json({ error: 'Member inactive' }, { status: 403 });
  }

  const result = await serverSignUpAuth.api.signUpEmail({
    body: {
      email,
      name: formatMemberName(member),
      password: body.password,
      username: membershipNumber,
    },
  });

  if (!result || ('error' in result && result.error)) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 400 });
  }

  await db
    .update(registrationTokens)
    .set({ usedAt: now })
    .where(eq(registrationTokens.id, token.id));

  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    action: 'auth.register',
    actorMembershipNumber: membershipNumber,
    summary: `Registered portal login for ${membershipNumber}`,
  });

  return NextResponse.json({ ok: true });
};
