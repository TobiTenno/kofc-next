import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { appMeta, duesRates, permissions } from '@/db/schema';
import { loadCouncilConfig, writeCouncilConfig } from '@/lib/council-config';
import { getCouncilJsonPath } from '@/lib/council-paths';
import {
  emptyPermissionLists,
  isPermissionKey,
  PERMISSION_KEYS,
  type PermissionKey,
} from '@/lib/utilities';

export type { PermissionKey };

const councilJsonHashKey = 'council_json_hash';

/** Webmaster always has every permission key (matches hasPermission). */
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
    ...(config.permissions ?? {}),
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
        target: permissions.key,
        set: {
          membershipNumbers: JSON.stringify(membershipNumbers),
          updatedAt: now,
        },
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

export const hashCouncilJsonContent = (): string | null => {
  const configPath = getCouncilJsonPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }

  const content = fs.readFileSync(configPath, 'utf8');
  return createHash('sha256').update(content).digest('hex');
};

/** Re-sync permissions/dues when mounted council.json changes (no restart). */
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

  const existingKeys = new Set(permissionKeyRows.map((row) => row.key));
  const missingPermissionKey = PERMISSION_KEYS.some(
    (key) => !existingKeys.has(key),
  );

  const configPath = getCouncilJsonPath();
  let missingJsonPermissionKey = false;
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      permissions?: Record<string, unknown>;
    };
    const rawPermissions = raw.permissions ?? {};
    missingJsonPermissionKey = PERMISSION_KEYS.some(
      (key) => !(key in rawPermissions),
    );
  }

  if (
    hashRows[0]?.value === hash &&
    !missingPermissionKey &&
    !missingJsonPermissionKey
  ) {
    return;
  }

  await syncPermissionsFromJson();
  await syncDuesFromJson();

  const nextHash = hashCouncilJsonContent() ?? hash;
  await db
    .insert(appMeta)
    .values({ key: councilJsonHashKey, value: nextHash })
    .onConflictDoUpdate({
      target: appMeta.key,
      set: { value: nextHash },
    });
};

const permissionMembersFromConfig = (key: PermissionKey): string[] => {
  const config = loadCouncilConfig();
  const block = config.permissions ?? emptyPermissionLists();
  return withWebmaster(block[key] ?? []);
};

export const hasPermission = async (
  membershipNumber: string,
  key: PermissionKey,
): Promise<boolean> => {
  if (isWebmaster(membershipNumber)) {
    return true;
  }

  await ensureCouncilConfigSynced();

  if (permissionMembersFromConfig(key).includes(membershipNumber)) {
    return true;
  }

  const rows = await db
    .select()
    .from(permissions)
    .where(eq(permissions.key, key))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return false;
  }

  const allowed = JSON.parse(row.membershipNumbers) as string[];
  return allowed.includes(membershipNumber);
};

export const updatePermissions = async (
  key: PermissionKey,
  membershipNumbers: string[],
  actorMembershipNumber?: string | null,
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
      target: permissions.key,
      set: {
        membershipNumbers: JSON.stringify(nextMembers),
        updatedAt: now,
      },
    });

  const config = loadCouncilConfig();
  const nextConfig = {
    ...config,
    permissions: {
      ...emptyPermissionLists(),
      ...(config.permissions ?? {}),
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
        target: appMeta.key,
        set: { value: hash },
      });
  }

  const { recordAuditEvent } = await import('@/lib/audit');
  await recordAuditEvent({
    actorMembershipNumber,
    action: 'permissions.update',
    summary: `Updated ${key} (${nextMembers.length} member${nextMembers.length === 1 ? '' : 's'})`,
    metadata: { key, count: nextMembers.length },
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
        memberClass,
        amountCents,
        councilYear,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: duesRates.memberClass,
        set: {
          amountCents,
          councilYear,
          updatedAt: now,
        },
      });
  }

  await db
    .insert(appMeta)
    .values({ key: 'dues_council_year', value: councilYear })
    .onConflictDoUpdate({
      target: appMeta.key,
      set: { value: councilYear },
    });
};

export const getCurrentCouncilYear = async (): Promise<string | null> => {
  const rows = await db
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, 'dues_council_year'))
    .limit(1);
  return rows[0]?.value ?? loadCouncilConfig().dues?.councilYear ?? null;
};
