import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { members } from '@/db/schema';
import { recordAuditEvent } from '@/lib/audit';
import { loadCouncilConfig, writeCouncilConfig } from '@/lib/council-config';
import { hasPermission } from '@/lib/permissions-sync';
import { getMembershipNumber } from '@/lib/session';
import { formatMemberName, normalizeEmail } from '@/lib/utils';
import { ALL_OFFICER_POSITIONS, type Position } from '@/schema/council';

export type OfficerDraft = {
  avatar?: string;
  email?: string;
  membershipNumber?: string;
  name: string;
  phone?: string;
  position: Position;
  termEnd?: string;
};

const isPosition = (value: string): value is Position =>
  (ALL_OFFICER_POSITIONS as string[]).includes(value);

export const GET = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageOfficers'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const config = loadCouncilConfig();
  return NextResponse.json({
    officers: config.council?.officers ?? [],
    positions: ALL_OFFICER_POSITIONS,
  });
};

export const PUT = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageOfficers'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as { officers?: OfficerDraft[] };
  if (!Array.isArray(body.officers)) {
    return NextResponse.json(
      { error: 'officers array is required' },
      { status: 400 },
    );
  }

  const cleaned: OfficerDraft[] = [];
  const seenPositions = new Set<string>();

  for (const raw of body.officers) {
    const name = raw.name?.trim() ?? '';
    const position = raw.position;
    if (!name || !isPosition(position)) {
      return NextResponse.json(
        { error: 'Each officer needs a name and valid position' },
        { status: 400 },
      );
    }

    if (seenPositions.has(position)) {
      return NextResponse.json(
        { error: `Duplicate position: ${position}` },
        { status: 400 },
      );
    }
    seenPositions.add(position);

    const email = raw.email?.trim() || undefined;
    if (email && !email.includes('@')) {
      return NextResponse.json(
        { error: `Invalid email for ${position}` },
        { status: 400 },
      );
    }

    const phone = raw.phone?.trim() || undefined;
    if (phone && (phone.length < 10 || phone.length > 15)) {
      return NextResponse.json(
        { error: `Invalid phone for ${position}` },
        { status: 400 },
      );
    }

    const memberNumber = raw.membershipNumber?.trim() || undefined;
    const termEnd = raw.termEnd?.trim() || undefined;
    const avatar = raw.avatar?.trim() || undefined;

    cleaned.push({
      name,
      position,
      ...(termEnd && { termEnd }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(memberNumber && { membershipNumber: memberNumber }),
      ...(avatar && { avatar }),
    });
  }

  const config = loadCouncilConfig();
  if (!config.council) {
    return NextResponse.json(
      { error: 'Council config is incomplete' },
      { status: 400 },
    );
  }

  writeCouncilConfig({
    ...config,
    council: {
      ...config.council,
      officers: cleaned,
    },
  });

  await recordAuditEvent({
    action: 'officers.update',
    actorMembershipNumber: membershipNumber,
    metadata: {
      count: cleaned.length,
      positions: cleaned.map(officer => officer.position),
    },
    summary: `Updated officers list (${cleaned.length} officers)`,
  });

  return NextResponse.json({ officers: cleaned });
};

/**
Lookup roster member to fill officer name/email/phone.
*/
export const POST = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasPermission(membershipNumber, 'manageOfficers'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as { membershipNumber?: string };
  const query = body.membershipNumber?.trim();
  if (!query) {
    return NextResponse.json(
      { error: 'membershipNumber is required' },
      { status: 400 },
    );
  }

  const member = await db.query.members.findFirst({
    where: eq(members.membershipNumber, query),
  });

  if (!member?.active) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  return NextResponse.json({
    member: {
      email: member.primaryEmail ? normalizeEmail(member.primaryEmail) : null,
      membershipNumber: member.membershipNumber,
      name: formatMemberName(member),
      phone: member.cellPhone ?? member.residencePhone ?? null,
    },
  });
};
