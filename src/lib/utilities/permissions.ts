import {
  formatCommaSeparatedList,
  parseCommaSeparatedList,
} from '@/lib/utilities/comma-list';

export const PERMISSION_KEYS = [
  'sendCouncilEmail',
  'managePermissions',
  'manageEvents',
  'manageGalleries',
  'manageRoster',
  'manageDues',
  'viewAuditLog',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  sendCouncilEmail: 'Send council email',
  managePermissions: 'Manage permissions',
  manageEvents: 'Manage events',
  manageGalleries: 'Manage galleries',
  manageRoster: 'Manage roster',
  manageDues: 'Manage dues',
  viewAuditLog: 'View audit log',
};

export const emptyPermissionLists = (): Record<PermissionKey, string[]> => ({
  sendCouncilEmail: [],
  managePermissions: [],
  manageEvents: [],
  manageGalleries: [],
  manageRoster: [],
  manageDues: [],
  viewAuditLog: [],
});

export const emptyPermissionDrafts = (): Record<PermissionKey, string> => ({
  sendCouncilEmail: '',
  managePermissions: '',
  manageEvents: '',
  manageGalleries: '',
  manageRoster: '',
  manageDues: '',
  viewAuditLog: '',
});

export const isPermissionKey = (value: string): value is PermissionKey =>
  (PERMISSION_KEYS as readonly string[]).includes(value);

export const parseMembershipNumbers = parseCommaSeparatedList;
export const formatMembershipNumbers = formatCommaSeparatedList;
