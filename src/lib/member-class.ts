/**
KofC Member Billing / roster class codes from council export.
*/
export const memberClassCodes = ['R', 'L', 'H', 'A', 'I'] as const;

export type MemberClassCode = (typeof memberClassCodes)[number];

export const memberClassLabels: Record<MemberClassCode, string> = {
  A: 'Affiliate',
  H: 'Honorary',
  I: 'Inactive',
  L: 'Lifetime',
  R: 'Regular',
};

export const isMemberClassCode = (value: string): value is MemberClassCode =>
  memberClassCodes.includes(value as MemberClassCode);

export const formatMemberClass = (
  code: null | string | undefined,
): null | string => {
  if (!code) {
    return null;
  }

  const normalized = code.trim().toUpperCase();
  if (isMemberClassCode(normalized)) {
    return memberClassLabels[normalized];
  }

  return code.trim();
};
