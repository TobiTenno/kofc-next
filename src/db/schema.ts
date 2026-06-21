import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  banned: integer('banned', { mode: 'boolean' }).default(false),
  banReason: text('ban_reason'),
  banExpires: integer('ban_expires', { mode: 'timestamp_ms' }),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', {
    mode: 'timestamp_ms',
  }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', {
    mode: 'timestamp_ms',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const members = sqliteTable('members', {
  membershipNumber: text('membership_number').primaryKey(),
  prefix: text('prefix'),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  lastName: text('last_name').notNull(),
  suffix: text('suffix'),
  memberType: text('member_type'),
  memberClass: text('member_class'),
  nickname: text('nickname'),
  residencePhone: text('residence_phone'),
  cellPhone: text('cell_phone'),
  primaryEmail: text('primary_email'),
  firstDegreeDate: text('first_degree_date'),
  secondDegreeDate: text('second_degree_date'),
  thirdDegreeDate: text('third_degree_date'),
  fourthDegreeDate: text('fourth_degree_date'),
  assemblyNumber: text('assembly_number'),
  birthDate: text('birth_date'),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  syncedAt: integer('synced_at', { mode: 'timestamp_ms' }).notNull(),
});

export const permissions = sqliteTable('permissions', {
  key: text('key').primaryKey(),
  membershipNumbers: text('membership_numbers').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  startAt: integer('start_at', { mode: 'timestamp_ms' }).notNull(),
  endAt: integer('end_at', { mode: 'timestamp_ms' }),
  allDay: integer('all_day', { mode: 'boolean' }).default(false).notNull(),
  type: text('type', { enum: ['council', 'member'] }).notNull(),
  recurrenceRule: text('recurrence_rule'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const duesRates = sqliteTable('dues_rates', {
  memberClass: text('member_class').primaryKey(),
  amountCents: integer('amount_cents').notNull(),
  councilYear: text('council_year').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const duesPayments = sqliteTable('dues_payments', {
  id: text('id').primaryKey(),
  membershipNumber: text('membership_number')
    .notNull()
    .references(() => members.membershipNumber),
  memberClass: text('member_class').notNull(),
  amountCents: integer('amount_cents').notNull(),
  councilYear: text('council_year').notNull(),
  source: text('source', { enum: ['paypal_ipn', 'manual'] }).notNull(),
  status: text('status', { enum: ['completed', 'refunded'] })
    .default('completed')
    .notNull(),
  paypalTxnId: text('paypal_txn_id').unique(),
  payerEmail: text('payer_email'),
  method: text('method', { enum: ['paypal', 'cash', 'check', 'other'] }),
  notes: text('notes'),
  markedByMembershipNumber: text('marked_by_membership_number'),
  paidAt: integer('paid_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const calendarTokens = sqliteTable('calendar_tokens', {
  id: text('id').primaryKey(),
  membershipNumber: text('membership_number')
    .notNull()
    .references(() => members.membershipNumber),
  tokenHash: text('token_hash').notNull(),
  feed: text('feed').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const registrationTokens = sqliteTable('registration_tokens', {
  id: text('id').primaryKey(),
  membershipNumber: text('membership_number').notNull(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp_ms' }),
});

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const photoGalleries = sqliteTable('photo_galleries', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  immichAlbumId: text('immich_album_id').notNull().unique(),
  allowMemberUploads: integer('allow_member_uploads', { mode: 'boolean' })
    .default(true)
    .notNull(),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const gallerySubmissions = sqliteTable('gallery_submissions', {
  id: text('id').primaryKey(),
  galleryId: text('gallery_id')
    .notNull()
    .references(() => photoGalleries.id, { onDelete: 'cascade' }),
  immichAssetId: text('immich_asset_id').notNull(),
  membershipNumber: text('membership_number')
    .notNull()
    .references(() => members.membershipNumber),
  filename: text('filename'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const authSchema = {
  user,
  session,
  account,
  verification,
};
