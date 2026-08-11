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

export const syncPermissionsFromJson = async (): Promise<void> => {
  const config = loadCouncilConfig();
  const now = new Date();
  const permissionBlock = config.permissions ?? emptyPermissionLists();

  if (config.webmaster?.membershipNumber) {
    const webmaster = config.webmaster.membershipNumber;
    for (const key of PERMISSION_KEYS) {
      if (!permissionBlock[key].includes(webmaster)) {
        permissionBlock[key] = [...permissionBlock[key], webmaster];
      }
    }
  }

  for (const key of PERMISSION_KEYS) {
    const membershipNumbers = permissionBlock[key] ?? [];
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

  return result;
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

  const rows = await db
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, councilJsonHashKey))
    .limit(1);

  if (rows[0]?.value === hash) {
    return;
  }

  await syncPermissionsFromJson();
  await syncDuesFromJson();

  await db
    .insert(appMeta)
    .values({ key: councilJsonHashKey, value: hash })
    .onConflictDoUpdate({
      target: appMeta.key,
      set: { value: hash },
    });
};

const permissionMembersFromConfig = (key: PermissionKey): string[] => {
  const config = loadCouncilConfig();
  const block = config.permissions ?? emptyPermissionLists();
  const members = [...(block[key] ?? [])];
  const webmaster = config.webmaster?.membershipNumber;

  if (webmaster && !members.includes(webmaster)) {
    members.push(webmaster);
  }

  return members;
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

  const config = loadCouncilConfig();
  const nextConfig = {
    ...config,
    permissions: {
      ...(config.permissions ?? emptyPermissionLists()),
      [key]: membershipNumbers,
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
    summary: `Updated ${key} (${membershipNumbers.length} member${membershipNumbers.length === 1 ? '' : 's'})`,
    metadata: { key, count: membershipNumbers.length },
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
