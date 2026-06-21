import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { eq, notInArray } from 'drizzle-orm';
import { db } from '@/db';
import { appMeta, members, user } from '@/db/schema';
import { normalizeEmail } from '@/lib/utils';

const csvPath = path.join(process.cwd(), 'src/data/council.csv');

type CsvRow = Record<string, string>;

const csvColumns = {
  membershipNumber: 'Membership Number',
  prefix: 'Prefix',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  suffix: 'Suffix',
  memberType: 'Member Type',
  memberClass: 'Member Class',
  nickname: 'Nickname',
  residencePhone: 'Residence Phone',
  cellPhone: 'Cell Phone',
  primaryEmail: 'Primary Email',
  firstDegreeDate: '1st Degree Date',
  secondDegreeDate: '2nd Degree Date',
  thirdDegreeDate: '3rd Degree Date',
  fourthDegreeDate: '4th Degree Date',
  assemblyNumber: 'Assembly Number',
  birthDate: 'Birth Date',
} as const;

export const readCouncilCsv = (): CsvRow[] => {
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
};

export const hashCsvContent = (): string | null => {
  if (!fs.existsSync(csvPath)) {
    return null;
  }
  const content = fs.readFileSync(csvPath, 'utf8');
  return createHash('sha256').update(content).digest('hex');
};

export const syncCouncilCsv = async (): Promise<{
  upserted: number;
  deactivated: number;
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
        membershipNumber,
        prefix: row[csvColumns.prefix] || null,
        firstName: row[csvColumns.firstName] || '',
        middleName: row[csvColumns.middleName] || null,
        lastName: row[csvColumns.lastName] || '',
        suffix: row[csvColumns.suffix] || null,
        memberType: row[csvColumns.memberType] || null,
        memberClass: row[csvColumns.memberClass] || null,
        nickname: row[csvColumns.nickname] || null,
        residencePhone: row[csvColumns.residencePhone] || null,
        cellPhone: row[csvColumns.cellPhone] || null,
        primaryEmail: row[csvColumns.primaryEmail]
          ? normalizeEmail(row[csvColumns.primaryEmail])
          : null,
        firstDegreeDate: row[csvColumns.firstDegreeDate] || null,
        secondDegreeDate: row[csvColumns.secondDegreeDate] || null,
        thirdDegreeDate: row[csvColumns.thirdDegreeDate] || null,
        fourthDegreeDate: row[csvColumns.fourthDegreeDate] || null,
        assemblyNumber: row[csvColumns.assemblyNumber] || null,
        birthDate: row[csvColumns.birthDate] || null,
        active: true,
        syncedAt: now,
      })
      .onConflictDoUpdate({
        target: members.membershipNumber,
        set: {
          prefix: row[csvColumns.prefix] || null,
          firstName: row[csvColumns.firstName] || '',
          middleName: row[csvColumns.middleName] || null,
          lastName: row[csvColumns.lastName] || '',
          suffix: row[csvColumns.suffix] || null,
          memberType: row[csvColumns.memberType] || null,
          memberClass: row[csvColumns.memberClass] || null,
          nickname: row[csvColumns.nickname] || null,
          residencePhone: row[csvColumns.residencePhone] || null,
          cellPhone: row[csvColumns.cellPhone] || null,
          primaryEmail: row[csvColumns.primaryEmail]
            ? normalizeEmail(row[csvColumns.primaryEmail])
            : null,
          firstDegreeDate: row[csvColumns.firstDegreeDate] || null,
          secondDegreeDate: row[csvColumns.secondDegreeDate] || null,
          thirdDegreeDate: row[csvColumns.thirdDegreeDate] || null,
          fourthDegreeDate: row[csvColumns.fourthDegreeDate] || null,
          assemblyNumber: row[csvColumns.assemblyNumber] || null,
          birthDate: row[csvColumns.birthDate] || null,
          active: true,
          syncedAt: now,
        },
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
        target: appMeta.key,
        set: { value: hash },
      });
  }

  return { upserted: activeNumbers.length, deactivated };
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
