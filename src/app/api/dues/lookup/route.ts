import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { members } from '@/db/schema';
import { getMemberDuesAmount, getPaypalBusinessEmail } from '@/lib/dues';

export const POST = async (request: Request): Promise<NextResponse> => {
  const body = (await request.json()) as {
    membershipNumber?: string;
    lastName?: string;
  };

  if (!body.membershipNumber || !body.lastName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const membershipNumber = body.membershipNumber.trim();
  const lastName = body.lastName.trim().toLowerCase();

  const member = await db.query.members.findFirst({
    where: and(
      eq(members.membershipNumber, membershipNumber),
      eq(members.active, true),
    ),
  });

  if (!member || member.lastName.toLowerCase() !== lastName) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const dues = await getMemberDuesAmount(membershipNumber);
  const paypalBusinessEmail = getPaypalBusinessEmail();

  if (!dues || !paypalBusinessEmail) {
    return NextResponse.json({ error: 'Dues unavailable' }, { status: 400 });
  }

  return NextResponse.json({
    member: {
      membershipNumber: member.membershipNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      memberClass: member.memberClass,
    },
    amountCents: dues.amountCents,
    councilYear: dues.councilYear,
    paypalBusinessEmail,
  });
};
