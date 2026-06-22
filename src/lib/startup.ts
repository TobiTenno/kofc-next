import { runMigrations } from '@/db';
import { rebuildCalendarCache } from '@/lib/calendar/cache';
import { shouldSyncCsv, syncCouncilCsv } from '@/lib/csv-sync';
import { ensureCouncilConfigSynced } from '@/lib/permissions-sync';

let started = false;

export const runStartupTasks = async (): Promise<void> => {
  if (started) {
    return;
  }
  started = true;

  runMigrations();
  await ensureCouncilConfigSynced();

  if (await shouldSyncCsv()) {
    await syncCouncilCsv();
  }

  await rebuildCalendarCache();
};
