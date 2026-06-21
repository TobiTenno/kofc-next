import { createHash, randomBytes } from 'node:crypto';

export const createId = (): string => randomBytes(16).toString('hex');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const generateCode = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

const hasSirKnightPrefix = (prefix: string): boolean =>
  /^(SK|Sir Knight)\b/i.test(prefix.trim());

export const isFourthDegreeKnight = (member: {
  fourthDegreeDate?: string | null;
}): boolean => Boolean(member.fourthDegreeDate?.trim());

export const formatMemberName = (member: {
  prefix?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  fourthDegreeDate?: string | null;
}): string => {
  const csvPrefix = member.prefix?.trim();
  const honorific = isFourthDegreeKnight(member)
    ? csvPrefix && hasSirKnightPrefix(csvPrefix)
      ? csvPrefix
      : 'SK'
    : csvPrefix || null;

  return [
    honorific,
    member.firstName,
    member.middleName,
    member.lastName,
    member.suffix?.trim(),
  ]
    .filter(Boolean)
    .join(' ');
};

export const maskMemberName = (member: {
  firstName: string;
  lastName: string;
}): string => `${member.firstName} ${member.lastName.charAt(0)}.`;

export const centsToDollars = (cents: number): string =>
  (cents / 100).toFixed(2);
