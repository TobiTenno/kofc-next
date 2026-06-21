import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';

const databasePath =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'app.db');

const ensureDatabaseDir = (): void => {
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDatabaseDir();

const sqlite = new Database(databasePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export const runMigrations = (): void => {
  ensureDatabaseDir();
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      username TEXT UNIQUE,
      display_username TEXT,
      banned INTEGER DEFAULT 0,
      ban_reason TEXT,
      ban_expires INTEGER
    );

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY NOT NULL,
      expires_at INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      password TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY NOT NULL,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS members (
      membership_number TEXT PRIMARY KEY NOT NULL,
      prefix TEXT,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      suffix TEXT,
      member_type TEXT,
      member_class TEXT,
      nickname TEXT,
      residence_phone TEXT,
      cell_phone TEXT,
      primary_email TEXT,
      first_degree_date TEXT,
      second_degree_date TEXT,
      third_degree_date TEXT,
      fourth_degree_date TEXT,
      assembly_number TEXT,
      birth_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      synced_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      key TEXT PRIMARY KEY NOT NULL,
      membership_numbers TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_at INTEGER NOT NULL,
      end_at INTEGER,
      all_day INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL,
      recurrence_rule TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dues_rates (
      member_class TEXT PRIMARY KEY NOT NULL,
      amount_cents INTEGER NOT NULL,
      council_year TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dues_payments (
      id TEXT PRIMARY KEY NOT NULL,
      membership_number TEXT NOT NULL REFERENCES members(membership_number),
      member_class TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      council_year TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      paypal_txn_id TEXT UNIQUE,
      payer_email TEXT,
      method TEXT,
      notes TEXT,
      marked_by_membership_number TEXT,
      paid_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_tokens (
      id TEXT PRIMARY KEY NOT NULL,
      membership_number TEXT NOT NULL REFERENCES members(membership_number),
      token_hash TEXT NOT NULL,
      feed TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS registration_tokens (
      id TEXT PRIMARY KEY NOT NULL,
      membership_number TEXT NOT NULL,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photo_galleries (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      immich_album_id TEXT NOT NULL UNIQUE,
      allow_member_uploads INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gallery_submissions (
      id TEXT PRIMARY KEY NOT NULL,
      gallery_id TEXT NOT NULL REFERENCES photo_galleries(id) ON DELETE CASCADE,
      immich_asset_id TEXT NOT NULL,
      membership_number TEXT NOT NULL REFERENCES members(membership_number),
      filename TEXT,
      created_at INTEGER NOT NULL
    );
  `);
};

export { databasePath };
