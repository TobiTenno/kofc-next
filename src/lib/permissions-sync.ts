import { and, eq, isNull, ne, or } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

import { db } from '@/db';
import { appMeta, duesRates, permissions, user } from '@/db/schema';
import { loadCouncilConfig, writeCouncilConfig } from '@/lib/council-config';
import { getCouncilJsonPath } from '@/lib/council-paths';
import {
  emptyPermissionLists,
  isPermissionKey,
  PERMISSION_KEYS,

} from '@/lib/utilities';

const councilJsonHashKey = 'council_json_hash';

/**
Webmaster always has every permission key (matches hasPermission).
*/
export const withWebmaster = (
  membershipNumbers: string[],
  webmaster = loadCouncilConfig().webmaster?.membershipNumber,
): string[] => {
  if (!webmaster || membershipNumbers.includes(webmaster)) {
    return membershipNumbers;
  }
  return [...membershipNumbers, webmaster];
};

const permissionListsWithWebmaster = (
  lists: Record<PermissionKey, string[]>,
): Record<PermissionKey, string[]> => {
  const next = emptyPermissionLists();
  for (const key of PERMISSION_KEYS) {
    next[key] = withWebmaster(lists[key] ?? []);
  }
  return next;
};

export const syncPermissionsFromJson = async (): Promise<void> => {
  const config = loadCouncilConfig();
  const now = new Date();
  const permissionBlock = permissionListsWithWebmaster({
    ...emptyPermissionLists(),
    ...config.permissions,
  });

  for (const key of PERMISSION_KEYS) {
    const membershipNumbers = permissionBlock[key];
    await db
      .insert(permissions)
      .values({
        key,
        membershipNumbers: JSON.stringify(membershipNumbers),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        set: {
          membershipNumbers: JSON.stringify(membershipNumbers),
          updatedAt: now,
        },
        target: permissions.key,
      });
  }

  // Persist new/default keys (e.g. manageRoster) so council.json matches runtime.
  writeCouncilConfig({
    ...config,
    permissions: permissionBlock,
  });
};

export const getPermissionsFromDb = async (): Promise<
  Record<PermissionKey, string[]>
> => {
  const rows = await db.select().from(permissions);
  const result = emptyPermissionLists();

  for (const row of rows) {
    if (isPermissionKey(row.key)) {
      result[row.key] = JSON.parse(row.membershipNumbers) as string[];
    }
  }

  return permissionListsWithWebmaster(result);
};

export const isWebmaster = (membershipNumber: string): boolean => {
  const config = loadCouncilConfig();
  return config.webmaster?.membershipNumber === membershipNumber;
};

/**
Keep Better Auth `admin` role aligned with council.json webmaster.
*/
export const syncWebmasterAuthRole = async (): Promise<void> => {
  const webmaster = loadCouncilConfig().webmaster?.membershipNumber ?? null;

  if (webmaster) {
    await db
      .update(user)
      .set({ role: 'admin' })
      .where(eq(user.username, webmaster));

    await db
      .update(user)
      .set({ role: 'user' })
      .where(and(eq(user.role, 'admin'), ne(user.username, webmaster)));

    await db
      .update(user)
      .set({ role: 'user' })
      .where(
        and(
          or(isNull(user.role), eq(user.role, '')),
          ne(user.username, webmaster),
        ),
      );
    return;
  }

  await db.update(user).set({ role: 'user' }).where(eq(user.role, 'admin'));
  await db
    .update(user)
    .set({ role: 'user' })
    .where(or(isNull(user.role), eq(user.role, '')));
};

export const hashCouncilJsonContent = (): null | string => {
  const configPath = getCouncilJsonPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }

  const content = fs.readFileSync(configPath, 'utf8');
  return createHash('sha256').update(content).digest('hex');
};

/**
Re-sync permissions/dues when mounted council.json changes (no restart).
*/
export const ensureCouncilConfigSynced = async (): Promise<void> => {
  const hash = hashCouncilJsonContent();
  if (!hash) {
    return;
  }

  const [hashRows, permissionKeyRows] = await Promise.all([
    db
      .select()
      .from(appMeta)
      .where(eq(appMeta.key, councilJsonHashKey))
      .limit(1),
    db.select({ key: permissions.key }).from(permissions),
  ]);

  const existingKeys = new Set(permissionKeyRows.map(row => row.key));
  const missingPermissionKey = PERMISSION_KEYS.some(
    key => !existingKeys.has(key),
  );

  const configPath = getCouncilJsonPath();
  let missingJsonPermissionKey = false;
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      permissions?: Record<string, unknown>;
    };
    const rawPermissions = raw.permissions ?? {};
    missingJsonPermissionKey = PERMISSION_KEYS.some(
      key => !(key in rawPermissions),
    );
  }

  if (
    hashRows[0]?.value === hash
    && !missingPermissionKey
    && !missingJsonPermissionKey
  ) {
    return;
  }

  await syncPermissionsFromJson();
  await syncDuesFromJson();
  await syncWebmasterAuthRole();

  const nextHash = hashCouncilJsonContent() ?? hash;
  await db
    .insert(appMeta)
    .values({ key: councilJsonHashKey, value: nextHash })
    .onConflictDoUpdate({
      set: { value: nextHash },
      target: appMeta.key,
    });
};

const permissionMembersFromConfig = (key: PermissionKey): string[] => {
  const config = loadCouncilConfig();
  const block = config.permissions ?? emptyPermissionLists();
  return withWebmaster(block[key] ?? []);
};

const membersForPermissionKey = async (
  key: PermissionKey,
): Promise<string[]> => {
  const rows = await db
    .select()
    .from(permissions)
    .where(eq(permissions.key, key))
    .limit(1);

  if (rows[0]) {
    return withWebmaster(JSON.parse(rows[0].membershipNumbers) as string[]);
  }

  return permissionMembersFromConfig(key);
};

const memberListedForKey = async (
  membershipNumber: string,
  key: PermissionKey,
): Promise<boolean> => {
  if (permissionMembersFromConfig(key).includes(membershipNumber)) {
    return true;
  }

  const allowed = await membersForPermissionKey(key);
  return allowed.includes(membershipNumber);
};

export const hasPermission = async (
  membershipNumber: string,
  key: PermissionKey,
): Promise<boolean> => {
  if (isWebmaster(membershipNumber)) {
    return true;
  }

  await ensureCouncilConfigSynced();

  // Anyone who can assign permissions can use every permission-gated feature
  // (including newly added keys) and edit those lists in the Permissions UI.
  if (
    key !== 'managePermissions'
    && (await memberListedForKey(membershipNumber, 'managePermissions'))
  ) {
    return true;
  }

  return memberListedForKey(membershipNumber, key);
};

export const updatePermissions = async (
  key: PermissionKey,
  membershipNumbers: string[],
  actorMembershipNumber?: null | string,
): Promise<void> => {
  const now = new Date();
  const nextMembers = withWebmaster(membershipNumbers);
  await db
    .insert(permissions)
    .values({
      key,
      membershipNumbers: JSON.stringify(nextMembers),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      set: {
        membershipNumbers: JSON.stringify(nextMembers),
        updatedAt: now,
      },
      target: permissions.key,
    });

  const config = loadCouncilConfig();
  const nextConfig = {
    ...config,
    permissions: {
      ...emptyPermissionLists(),
      ...config.permissions,
      [key]: nextMembers,
    },
  };
  writeCouncilConfig(nextConfig);

  const hash = hashCouncilJsonContent();
  if (hash) {
    await db
      .insert(appMeta)
      .values({ key: councilJsonHashKey, value: hash })
      .onConflictDoUpdate({
        set: { value: hash },
        target: appMeta.key,
      });
  }

  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    action: 'permissions.update',
    actorMembershipNumber,
    metadata: { count: nextMembers.length, key },
    summary: `Updated ${key} (${nextMembers.length} member${nextMembers.length === 1 ? '' : 's'})`,
  });
};

export const syncDuesFromJson = async (): Promise<void> => {
  const config = loadCouncilConfig();
  if (!config.dues) {
    return;
  }

  const now = new Date();
  const { councilYear, rates } = config.dues;

  for (const [memberClass, amountCents] of Object.entries(rates)) {
    await db
      .insert(duesRates)
      .values({
        amountCents,
        councilYear,
        memberClass,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        set: {
          amountCents,
          councilYear,
          updatedAt: now,
        },
        target: duesRates.memberClass,
      });
  }

  await db
    .insert(appMeta)
    .values({ key: 'dues_council_year', value: councilYear })
    .onConflictDoUpdate({
      set: { value: councilYear },
      target: appMeta.key,
    });
};

export const getCurrentCouncilYear = async (): Promise<null | string> => {
  const rows = await db
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, 'dues_council_year'))
    .limit(1);
  return rows[0]?.value ?? loadCouncilConfig().dues?.councilYear ?? null;
};

export { type PermissionKey } from '@/lib/utilities';
