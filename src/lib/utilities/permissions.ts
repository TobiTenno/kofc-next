import {
  formatCommaSeparatedList,
  parseCommaSeparatedList,
} from '@/lib/utilities/comma-list';

export const PERMISSION_KEYS = [
  'sendCouncilEmail',
  'managePermissions',
  'manageEvents',
  'manageGalleries',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  sendCouncilEmail: 'Send council email',
  managePermissions: 'Manage permissions',
  manageEvents: 'Manage events',
  manageGalleries: 'Manage galleries',
};

export const emptyPermissionLists = (): Record<PermissionKey, string[]> => ({
  sendCouncilEmail: [],
  managePermissions: [],
  manageEvents: [],
  manageGalleries: [],
});

export const emptyPermissionDrafts = (): Record<PermissionKey, string> => ({
  sendCouncilEmail: '',
  managePermissions: '',
  manageEvents: '',
  manageGalleries: '',
});

export const isPermissionKey = (value: string): value is PermissionKey =>
  (PERMISSION_KEYS as readonly string[]).includes(value);

export const parseMembershipNumbers = parseCommaSeparatedList;
export const formatMembershipNumbers = formatCommaSeparatedList;
