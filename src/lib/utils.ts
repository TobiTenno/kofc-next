import { createHash, randomBytes } from 'node:crypto';

export const createId = (): string => randomBytes(16).toString('hex');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const generateCode = (): string =>
  String(Math.floor(100_000 + Math.random() * 900_000));

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

const hasSirKnightPrefix = (prefix: string): boolean =>
  /^(SK|Sir Knight)\b/i.test(prefix.trim());

export const isFourthDegreeKnight = (member: {
  fourthDegreeDate?: null | string;
}): boolean => Boolean(member.fourthDegreeDate?.trim());

export const formatMemberName = (member: {
  firstName: string;
  fourthDegreeDate?: null | string;
  lastName: string;
  middleName?: null | string;
  prefix?: null | string;
  suffix?: null | string;
}): string => {
  const csvPrefix = member.prefix?.trim();
  const honorific = isFourthDegreeKnight(member)
    ? (csvPrefix && hasSirKnightPrefix(csvPrefix)
        ? csvPrefix
        : 'SK')
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

export const maskSecret = (value: null | string | undefined): null | string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= 4) {
    return '••••';
  }
  return `••••${trimmed.slice(-4)}`;
};
