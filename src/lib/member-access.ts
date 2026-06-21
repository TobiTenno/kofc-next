import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { members } from '@/db/schema';

export const assertActiveMember = async (
  membershipNumber: string,
): Promise<boolean> => {
  const member = await db.query.members.findFirst({
    where: eq(members.membershipNumber, membershipNumber),
  });

  return Boolean(member?.active);
};
