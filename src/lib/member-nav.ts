import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { members } from '@/db/schema';
import {
  getMemberPaymentStatus,
  isDuesConfigured,
  isPayPalConfigured,
} from '@/lib/dues';
import { isImmichConfigured } from '@/lib/immich/client';
import { canViewRoster, isFinancialSecretary } from '@/lib/officers';
import { hasPermission, isWebmaster } from '@/lib/permissions-sync';
import { centsToDollars, formatMemberName } from '@/lib/utils';

export type MemberNavContext = {
  links: MemberNavGroups;
  meta: MemberNavMeta;
};

export type MemberNavDuesMeta = {
  amountCents: null | number;
  amountLabel: null | string;
  councilYear: null | string;
  detailsHref: string;
  paid: boolean;
  payHref: null | string;
};

export type MemberNavGroups = {
  admin: MemberNavLink[];
  member: MemberNavLink[];
};

export type MemberNavLink = {
  href: string;
  label: string;
};

export type MemberNavMeta = {
  displayName: string;
  dues: MemberNavDuesMeta | null;
  memberClass: null | string;
  membershipNumber: string;
};

export const buildMemberNavLinks = async (
  membershipNumber: string,
): Promise<MemberNavGroups> => {
  const [
    canEmail,
    canPermissions,
    canEvents,
    canGalleries,
    canRoster,
    canOfficers,
    canDues,
    canAudit,
    isFs,
    showRoster,
    duesConfigured,
  ] = await Promise.all([
    hasPermission(membershipNumber, 'sendCouncilEmail'),
    hasPermission(membershipNumber, 'managePermissions'),
    hasPermission(membershipNumber, 'manageEvents'),
    hasPermission(membershipNumber, 'manageGalleries'),
    hasPermission(membershipNumber, 'manageRoster'),
    hasPermission(membershipNumber, 'manageOfficers'),
    hasPermission(membershipNumber, 'manageDues'),
    hasPermission(membershipNumber, 'viewAuditLog'),
    isFinancialSecretary(membershipNumber),
    canViewRoster(membershipNumber),
    isDuesConfigured(),
  ]);

  const galleriesEnabled = isImmichConfigured();

  const member: MemberNavLink[] = [
    ...(showRoster ? [{ href: '/members/roster', label: 'Roster' }] : []),
    { href: '/members/calendar', label: 'My Calendar' },
    ...(galleriesEnabled
      ? [{ href: '/members/galleries', label: 'Galleries' }]
      : []),
    ...(duesConfigured ? [{ href: '/members/dues', label: 'Dues' }] : []),
  ];

  if (canEmail) {
    member.push({ href: '/members/email', label: 'Email Council' });
  }

  const admin: MemberNavLink[] = [];

  if (canPermissions) {
    admin.push({
      href: '/members/admin/permissions',
      label: 'Permissions',
    });
  }

  if (canEvents) {
    admin.push({ href: '/members/admin/events', label: 'Events' });
  }

  if (canGalleries) {
    admin.push({ href: '/members/admin/galleries', label: 'Galleries' });
  }

  if (canRoster) {
    admin.push({
      href: '/members/admin/roster-upload',
      label: 'Roster Admin',
    });
  }

  if (canOfficers) {
    admin.push({
      href: '/members/admin/officers',
      label: 'Officers',
    });
  }

  if (canDues || isFs) {
    admin.push({ href: '/members/admin/dues', label: 'Dues Admin' });
  }

  if (canAudit) {
    admin.push({ href: '/members/admin/audit', label: 'Audit Log' });
  }

  if (isWebmaster(membershipNumber)) {
    admin.push({
      href: '/members/admin/impersonate',
      label: 'Impersonate',
    });
  }

  return { admin, member };
};

const buildDuesMeta = async (
  membershipNumber: string,
): Promise<MemberNavDuesMeta | null> => {
  if (!(await isDuesConfigured())) {
    return null;
  }

  const status = await getMemberPaymentStatus(membershipNumber);

  if (!status.councilYear && status.amountCents == null) {
    return null;
  }

  return {
    amountCents: status.amountCents,
    amountLabel:
      status.amountCents == null ? null : centsToDollars(status.amountCents),
    councilYear: status.councilYear,
    detailsHref: '/members/dues',
    paid: status.paid,
    payHref:
      status.paid || !isPayPalConfigured()
        ? null
        : `/dues/pay?member=${encodeURIComponent(membershipNumber)}`,
  };
};

export const buildMemberNavContext = async (
  membershipNumber: string,
): Promise<MemberNavContext> => {
  const [links, member, dues] = await Promise.all([
    buildMemberNavLinks(membershipNumber),
    db.query.members.findFirst({
      where: eq(members.membershipNumber, membershipNumber),
    }),
    buildDuesMeta(membershipNumber),
  ]);

  return {
    links,
    meta: {
      displayName: member ? formatMemberName(member) : membershipNumber,
      dues,
      memberClass: member?.memberClass ?? null,
      membershipNumber,
    },
  };
};
