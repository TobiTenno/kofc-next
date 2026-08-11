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
import { hasPermission } from '@/lib/permissions-sync';
import { centsToDollars, formatMemberName } from '@/lib/utils';

export type MemberNavLink = {
  href: string;
  label: string;
};

export type MemberNavGroups = {
  member: MemberNavLink[];
  admin: MemberNavLink[];
};

export type MemberNavDuesMeta = {
  councilYear: string | null;
  amountCents: number | null;
  amountLabel: string | null;
  paid: boolean;
  payHref: string | null;
  detailsHref: string;
};

export type MemberNavMeta = {
  membershipNumber: string;
  displayName: string;
  memberClass: string | null;
  dues: MemberNavDuesMeta | null;
};

export type MemberNavContext = {
  links: MemberNavGroups;
  meta: MemberNavMeta;
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
    admin.push({
      href: '/members/admin/galleries/settings',
      label: 'Gallery Settings',
    });
  }

  if (canRoster) {
    admin.push({
      href: '/members/admin/roster-upload',
      label: 'Roster Admin',
    });
  }

  if (canDues || isFs) {
    admin.push({ href: '/members/admin/dues', label: 'Dues Admin' });
  }

  if (canDues) {
    admin.push({
      href: '/members/admin/dues/settings',
      label: 'Dues Settings',
    });
  }

  if (canAudit) {
    admin.push({ href: '/members/admin/audit', label: 'Audit Log' });
  }

  return { member, admin };
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
    councilYear: status.councilYear,
    amountCents: status.amountCents,
    amountLabel:
      status.amountCents != null ? centsToDollars(status.amountCents) : null,
    paid: status.paid,
    payHref:
      status.paid || !isPayPalConfigured()
        ? null
        : `/dues/pay?member=${encodeURIComponent(membershipNumber)}`,
    detailsHref: '/members/dues',
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
      membershipNumber,
      displayName: member ? formatMemberName(member) : membershipNumber,
      memberClass: member?.memberClass ?? null,
      dues,
    },
  };
};
