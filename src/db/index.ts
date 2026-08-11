import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@/db/schema';

const resolveDatabasePath = (): string => {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return ':memory:';
  }
  return path.join(process.cwd(), 'data', 'app.db');
};

const databasePath = resolveDatabasePath();

const ensureDatabaseDir = (): void => {
  if (databasePath === ':memory:') {
    return;
  }

  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDatabaseDir();

const sqlite = new Database(databasePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema });

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../drizzle',
);

export const runMigrations = (): void => {
  ensureDatabaseDir();
  migrate(db, { migrationsFolder });
};

export { databasePath };
