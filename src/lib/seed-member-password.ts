import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { account, members, session, user } from '@/db/schema';
import { serverSignUpAuth } from '@/lib/auth';
import { syncCouncilCsv } from '@/lib/csv-sync';
import { formatMemberName, normalizeEmail } from '@/lib/utils';

export type SeedMemberPasswordOptions = {
  membershipNumber: string;
  password: string;
  reset?: boolean;
};

export type SeedMemberPasswordResult =
  | { action: 'created'; membershipNumber: string; email: string }
  | { action: 'reset'; membershipNumber: string; email: string }
  | { action: 'skipped'; membershipNumber: string; reason: string };

const devEmailForMember = (membershipNumber: string): string =>
  `member-${membershipNumber}@dev.local`;

const resolveMemberEmail = (member: {
  membershipNumber: string;
  primaryEmail: string | null;
}): string => {
  if (member.primaryEmail) {
    return normalizeEmail(member.primaryEmail);
  }
  return devEmailForMember(member.membershipNumber);
};

const removeExistingUser = async (
  membershipNumber: string,
): Promise<boolean> => {
  const existing = await db.query.user.findFirst({
    where: eq(user.username, membershipNumber),
  });

  if (!existing) {
    return false;
  }

  await db.delete(session).where(eq(session.userId, existing.id));
  await db.delete(account).where(eq(account.userId, existing.id));
  await db.delete(user).where(eq(user.id, existing.id));
  return true;
};

export const seedMemberPassword = async (
  options: SeedMemberPasswordOptions,
): Promise<SeedMemberPasswordResult> => {
  const membershipNumber = options.membershipNumber.trim();
  const password = options.password;

  if (!/^\d+$/.test(membershipNumber)) {
    throw new Error('Membership number must be numeric');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  let member = await db.query.members.findFirst({
    where: eq(members.membershipNumber, membershipNumber),
  });

  if (!member) {
    await syncCouncilCsv();
    member = await db.query.members.findFirst({
      where: eq(members.membershipNumber, membershipNumber),
    });
  }

  if (!member) {
    throw new Error(`Member ${membershipNumber} not found in council roster`);
  }

  if (!member.active) {
    throw new Error(`Member ${membershipNumber} is inactive in roster`);
  }

  const email = resolveMemberEmail(member);
  const existing = await db.query.user.findFirst({
    where: eq(user.username, membershipNumber),
  });

  if (existing && !options.reset) {
    return {
      action: 'skipped',
      membershipNumber,
      reason: 'User already exists (pass --reset to replace)',
    };
  }

  const hadUser = existing ? await removeExistingUser(membershipNumber) : false;

  const result = await serverSignUpAuth.api.signUpEmail({
    body: {
      email,
      password,
      name: formatMemberName(member),
      username: membershipNumber,
    },
  });

  if (!result || ('error' in result && result.error)) {
    throw new Error('Failed to create auth user');
  }

  return {
    action: hadUser ? 'reset' : 'created',
    membershipNumber,
    email,
  };
};
