import type { members } from '@/db/schema';

import { formatMemberClass } from '@/lib/member-class';
import {

  formatDegreeDate,
  getHighestDegreeLabel,
} from '@/lib/member-degrees';
import { formatMemberName } from '@/lib/utils';

export type RosterMember = {
  active: boolean;
  displayName: string;
  firstDegreeDate: string;
  firstName: string;
  fourthDegreeDate: string;
  highestDegree: null | string;
  lastName: string;
  memberClass: null | string;
  memberClassLabel: null | string;
  membershipNumber: string;
  primaryEmail: null | string;
  secondDegreeDate: string;
  thirdDegreeDate: string;
};

export type RosterMemberRow = RosterMember & {
  firstDegreeDateRaw: null | string;
  fourthDegreeDateRaw: null | string;
  secondDegreeDateRaw: null | string;
  thirdDegreeDateRaw: null | string;
};

export const serializeRosterMembers = (
  rows: (typeof members.$inferSelect)[],
): RosterMemberRow[] =>
  rows.map(member => ({
    active: member.active,
    displayName: formatMemberName(member),
    firstDegreeDate: formatDegreeDate(member.firstDegreeDate),
    firstDegreeDateRaw: member.firstDegreeDate,
    firstName: member.firstName,
    fourthDegreeDate: formatDegreeDate(member.fourthDegreeDate),
    fourthDegreeDateRaw: member.fourthDegreeDate,
    highestDegree: getHighestDegreeLabel(member),
    lastName: member.lastName,
    memberClass: member.memberClass,
    memberClassLabel: formatMemberClass(member.memberClass),
    membershipNumber: member.membershipNumber,
    primaryEmail: member.primaryEmail,
    secondDegreeDate: formatDegreeDate(member.secondDegreeDate),
    secondDegreeDateRaw: member.secondDegreeDate,
    thirdDegreeDate: formatDegreeDate(member.thirdDegreeDate),
    thirdDegreeDateRaw: member.thirdDegreeDate,
  }));

export { degreeDateFields } from '@/lib/member-degrees';
