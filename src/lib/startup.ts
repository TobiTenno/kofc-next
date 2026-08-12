import { runMigrations } from '@/db';
import { rebuildCalendarCache } from '@/lib/calendar/cache';
import { shouldSyncCsv, syncCouncilCsv } from '@/lib/csv-sync';
import { ensureImmichConfigSynced } from '@/lib/immich/config';
import { getPaypalSubSyncIntervalMs } from '@/lib/paypal';
import { startPaypalSubscriptionSyncScheduler } from '@/lib/paypal-subscription-sync';
import {
  ensureCouncilConfigSynced,
  syncWebmasterAuthRole,
} from '@/lib/permissions-sync';

let started = false;

export const runStartupTasks = async (): Promise<void> => {
  if (started) {
    return;
  }
  started = true;

  runMigrations();
  await ensureCouncilConfigSynced();
  // Always re-assert webmaster ↔ admin role (sync may no-op when hash unchanged).
  await syncWebmasterAuthRole();
  await ensureImmichConfigSynced();

  if (await shouldSyncCsv()) {
    await syncCouncilCsv();
  }

  await rebuildCalendarCache();
  startPaypalSubscriptionSyncScheduler(getPaypalSubSyncIntervalMs());
};
