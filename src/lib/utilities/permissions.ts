export const PERMISSION_KEYS = [
  'sendCouncilEmail',
  'managePermissions',
  'manageEvents',
  'manageGalleries',
  'manageRoster',
  'manageOfficers',
  'manageDues',
  'viewAuditLog',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manageDues: 'Manage dues',
  manageEvents: 'Manage events',
  manageGalleries: 'Manage galleries',
  manageOfficers: 'Manage officers',
  managePermissions: 'Manage permissions',
  manageRoster: 'Manage roster',
  sendCouncilEmail: 'Send council email',
  viewAuditLog: 'View audit log',
};

export const emptyPermissionLists = (): Record<PermissionKey, string[]> => ({
  manageDues: [],
  manageEvents: [],
  manageGalleries: [],
  manageOfficers: [],
  managePermissions: [],
  manageRoster: [],
  sendCouncilEmail: [],
  viewAuditLog: [],
});

export const emptyPermissionDrafts = (): Record<PermissionKey, string> => ({
  manageDues: '',
  manageEvents: '',
  manageGalleries: '',
  manageOfficers: '',
  managePermissions: '',
  manageRoster: '',
  sendCouncilEmail: '',
  viewAuditLog: '',
});

export const isPermissionKey = (value: string): value is PermissionKey =>
  (PERMISSION_KEYS as readonly string[]).includes(value);

export { formatCommaSeparatedList as formatMembershipNumbers, parseCommaSeparatedList as parseMembershipNumbers } from '@/lib/utilities/comma-list';
