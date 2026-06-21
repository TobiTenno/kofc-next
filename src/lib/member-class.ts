/** KofC Member Billing / roster class codes from council export. */
export const memberClassCodes = ['R', 'L', 'H', 'A', 'I'] as const;

export type MemberClassCode = (typeof memberClassCodes)[number];

export const memberClassLabels: Record<MemberClassCode, string> = {
  R: 'Regular',
  L: 'Lifetime',
  H: 'Honorary',
  A: 'Affiliate',
  I: 'Inactive',
};

export const isMemberClassCode = (value: string): value is MemberClassCode =>
  memberClassCodes.includes(value as MemberClassCode);

export const formatMemberClass = (
  code: string | null | undefined,
): string | null => {
  if (!code) {
    return null;
  }

  const normalized = code.trim().toUpperCase();
  if (isMemberClassCode(normalized)) {
    return memberClassLabels[normalized];
  }

  return code.trim();
};
