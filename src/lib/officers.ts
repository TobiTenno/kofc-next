import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { members } from '@/db/schema';
import { loadCouncilConfig } from '@/lib/council-config';
import { hasPermission, isWebmaster } from '@/lib/permissions-sync';
import { normalizeEmail } from '@/lib/utils';
import { Position } from '@/schema/council';

export const getFinancialSecretaryMembershipNumber = async (): Promise<
  string | null
> => {
  const config = loadCouncilConfig();
  const fsOfficer = config.council?.officers?.find(
    (officer) => officer.position === Position.FinancialSecretary,
  );

  if (!fsOfficer?.email) {
    return null;
  }

  const email = normalizeEmail(fsOfficer.email);
  const member = await db.query.members.findFirst({
    where: eq(members.primaryEmail, email),
  });

  return member?.membershipNumber ?? null;
};

export const isFinancialSecretary = async (
  membershipNumber: string,
): Promise<boolean> => {
  const fsNumber = await getFinancialSecretaryMembershipNumber();
  return fsNumber === membershipNumber;
};

/** Dues column, dues filter, and bulk roster email — financial secretary or webmaster. */
export const canUseRosterAdminTools = async (
  membershipNumber: string,
): Promise<boolean> => {
  if (isWebmaster(membershipNumber)) {
    return true;
  }

  return isFinancialSecretary(membershipNumber);
};

/** Single or bulk roster email — admin tools or sendCouncilEmail permission. */
export const canSendRosterEmail = async (
  membershipNumber: string,
): Promise<boolean> => {
  if (await canUseRosterAdminTools(membershipNumber)) {
    return true;
  }

  return hasPermission(membershipNumber, 'sendCouncilEmail');
};

/** Council roster — webmaster or current officer (matched via roster email). */
export const canViewRoster = async (
  membershipNumber: string,
): Promise<boolean> => {
  if (isWebmaster(membershipNumber)) {
    return true;
  }

  const officerNumbers = Object.values(await getOfficerMembershipNumbers());
  return officerNumbers.includes(membershipNumber);
};

export const getOfficerMembershipNumbers = async (): Promise<
  Record<string, string>
> => {
  const config = loadCouncilConfig();
  const officers = config.council?.officers ?? [];
  const mapping: Record<string, string> = {};

  for (const officer of officers) {
    if (!officer.email) {
      continue;
    }

    const member = await db.query.members.findFirst({
      where: eq(members.primaryEmail, normalizeEmail(officer.email)),
    });

    if (member) {
      mapping[officer.position] = member.membershipNumber;
    }
  }

  return mapping;
};
