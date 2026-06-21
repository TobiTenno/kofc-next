import { runMigrations } from '@/db';
import { rebuildCalendarCache } from '@/lib/calendar/cache';
import { shouldSyncCsv, syncCouncilCsv } from '@/lib/csv-sync';
import {
  syncDuesFromJson,
  syncPermissionsFromJson,
} from '@/lib/permissions-sync';

let started = false;

export const runStartupTasks = async (): Promise<void> => {
  if (started) {
    return;
  }
  started = true;

  runMigrations();
  await syncPermissionsFromJson();
  await syncDuesFromJson();

  if (await shouldSyncCsv()) {
    await syncCouncilCsv();
  }

  await rebuildCalendarCache();
};
