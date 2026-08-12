import { parse } from 'csv-parse/sync';
import { eq, notInArray } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { db } from '@/db';
import { appMeta, members, user } from '@/db/schema';
import { getCouncilCsvPath } from '@/lib/council-paths';
import { normalizeEmail } from '@/lib/utils';

const csvPath = (): string => getCouncilCsvPath();

type CsvRow = Record<string, string>;

const csvColumns = {
  assemblyNumber: 'Assembly Number',
  birthDate: 'Birth Date',
  cellPhone: 'Cell Phone',
  firstDegreeDate: '1st Degree Date',
  firstName: 'First Name',
  fourthDegreeDate: '4th Degree Date',
  lastName: 'Last Name',
  memberClass: 'Member Class',
  membershipNumber: 'Membership Number',
  memberType: 'Member Type',
  middleName: 'Middle Name',
  nickname: 'Nickname',
  prefix: 'Prefix',
  primaryEmail: 'Primary Email',
  residencePhone: 'Residence Phone',
  secondDegreeDate: '2nd Degree Date',
  suffix: 'Suffix',
  thirdDegreeDate: '3rd Degree Date',
} as const;

export const readCouncilCsv = (): CsvRow[] => {
  if (!fs.existsSync(csvPath())) {
    return [];
  }

  const content = fs.readFileSync(csvPath(), 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
};

export const writeCouncilCsv = (content: string): { rowCount: number } => {
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (rows.length === 0) {
    throw new Error('CSV has no data rows');
  }

  const first = rows[0];
  if (!first || !(csvColumns.membershipNumber in first)) {
    throw new Error(
      `CSV must include a “${csvColumns.membershipNumber}” column`,
    );
  }

  const hasMembership = rows.some(row =>
    Boolean(row[csvColumns.membershipNumber]?.trim()),
  );
  if (!hasMembership) {
    throw new Error('CSV has no membership numbers');
  }

  const target = csvPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
  return { rowCount: rows.length };
};

export const hashCsvContent = (): null | string => {
  if (!fs.existsSync(csvPath())) {
    return null;
  }
  const content = fs.readFileSync(csvPath(), 'utf8');
  return createHash('sha256').update(content).digest('hex');
};

export const syncCouncilCsv = async (): Promise<{
  deactivated: number;
  upserted: number;
}> => {
  const rows = readCouncilCsv();
  const now = new Date();
  const activeNumbers: string[] = [];

  for (const row of rows) {
    const membershipNumber = row[csvColumns.membershipNumber]?.trim();
    if (!membershipNumber) {
      continue;
    }

    activeNumbers.push(membershipNumber);

    await db
      .insert(members)
      .values({
        active: true,
        assemblyNumber: row[csvColumns.assemblyNumber] || null,
        birthDate: row[csvColumns.birthDate] || null,
        cellPhone: row[csvColumns.cellPhone] || null,
        firstDegreeDate: row[csvColumns.firstDegreeDate] || null,
        firstName: row[csvColumns.firstName] || '',
        fourthDegreeDate: row[csvColumns.fourthDegreeDate] || null,
        lastName: row[csvColumns.lastName] || '',
        memberClass: row[csvColumns.memberClass] || null,
        membershipNumber,
        memberType: row[csvColumns.memberType] || null,
        middleName: row[csvColumns.middleName] || null,
        nickname: row[csvColumns.nickname] || null,
        prefix: row[csvColumns.prefix] || null,
        primaryEmail: row[csvColumns.primaryEmail]
          ? normalizeEmail(row[csvColumns.primaryEmail])
          : null,
        residencePhone: row[csvColumns.residencePhone] || null,
        secondDegreeDate: row[csvColumns.secondDegreeDate] || null,
        suffix: row[csvColumns.suffix] || null,
        syncedAt: now,
        thirdDegreeDate: row[csvColumns.thirdDegreeDate] || null,
      })
      .onConflictDoUpdate({
        set: {
          active: true,
          assemblyNumber: row[csvColumns.assemblyNumber] || null,
          birthDate: row[csvColumns.birthDate] || null,
          cellPhone: row[csvColumns.cellPhone] || null,
          firstDegreeDate: row[csvColumns.firstDegreeDate] || null,
          firstName: row[csvColumns.firstName] || '',
          fourthDegreeDate: row[csvColumns.fourthDegreeDate] || null,
          lastName: row[csvColumns.lastName] || '',
          memberClass: row[csvColumns.memberClass] || null,
          memberType: row[csvColumns.memberType] || null,
          middleName: row[csvColumns.middleName] || null,
          nickname: row[csvColumns.nickname] || null,
          prefix: row[csvColumns.prefix] || null,
          primaryEmail: row[csvColumns.primaryEmail]
            ? normalizeEmail(row[csvColumns.primaryEmail])
            : null,
          residencePhone: row[csvColumns.residencePhone] || null,
          secondDegreeDate: row[csvColumns.secondDegreeDate] || null,
          suffix: row[csvColumns.suffix] || null,
          syncedAt: now,
          thirdDegreeDate: row[csvColumns.thirdDegreeDate] || null,
        },
        target: members.membershipNumber,
      });
  }

  let deactivated = 0;
  if (activeNumbers.length > 0) {
    const inactive = await db
      .select({ membershipNumber: members.membershipNumber })
      .from(members)
      .where(notInArray(members.membershipNumber, activeNumbers));

    for (const row of inactive) {
      await db
        .update(members)
        .set({ active: false, syncedAt: now })
        .where(eq(members.membershipNumber, row.membershipNumber));

      await db
        .update(user)
        .set({ banned: true, banReason: 'Removed from council roster' })
        .where(eq(user.username, row.membershipNumber));

      deactivated += 1;
    }
  }

  for (const membershipNumber of activeNumbers) {
    await db
      .update(user)
      .set({ banned: false, banReason: null })
      .where(eq(user.username, membershipNumber));
  }

  const hash = hashCsvContent();
  if (hash) {
    await db
      .insert(appMeta)
      .values({ key: 'csv_hash', value: hash })
      .onConflictDoUpdate({
        set: { value: hash },
        target: appMeta.key,
      });
  }

  return { deactivated, upserted: activeNumbers.length };
};

export const shouldSyncCsv = async (): Promise<boolean> => {
  const hash = hashCsvContent();
  if (!hash) {
    return false;
  }

  const rows = await db
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, 'csv_hash'))
    .limit(1);

  return rows[0]?.value !== hash;
};
