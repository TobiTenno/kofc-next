import type { members } from '@/db/schema';
import { formatMemberClass } from '@/lib/member-class';
import {
  degreeDateFields,
  formatDegreeDate,
  getHighestDegreeLabel,
} from '@/lib/member-degrees';
import { formatMemberName } from '@/lib/utils';

export type RosterMember = {
  membershipNumber: string;
  displayName: string;
  memberClass: string | null;
  memberClassLabel: string | null;
  highestDegree: string | null;
  firstDegreeDate: string;
  secondDegreeDate: string;
  thirdDegreeDate: string;
  fourthDegreeDate: string;
  primaryEmail: string | null;
  active: boolean;
};

export type RosterMemberRow = RosterMember & {
  firstDegreeDateRaw: string | null;
  secondDegreeDateRaw: string | null;
  thirdDegreeDateRaw: string | null;
  fourthDegreeDateRaw: string | null;
};

export const serializeRosterMembers = (
  rows: (typeof members.$inferSelect)[],
): RosterMemberRow[] =>
  rows.map((member) => ({
    membershipNumber: member.membershipNumber,
    displayName: formatMemberName(member),
    memberClass: member.memberClass,
    memberClassLabel: formatMemberClass(member.memberClass),
    highestDegree: getHighestDegreeLabel(member),
    firstDegreeDate: formatDegreeDate(member.firstDegreeDate),
    secondDegreeDate: formatDegreeDate(member.secondDegreeDate),
    thirdDegreeDate: formatDegreeDate(member.thirdDegreeDate),
    fourthDegreeDate: formatDegreeDate(member.fourthDegreeDate),
    firstDegreeDateRaw: member.firstDegreeDate,
    secondDegreeDateRaw: member.secondDegreeDate,
    thirdDegreeDateRaw: member.thirdDegreeDate,
    fourthDegreeDateRaw: member.fourthDegreeDate,
    primaryEmail: member.primaryEmail,
    active: member.active,
  }));

export { degreeDateFields };
