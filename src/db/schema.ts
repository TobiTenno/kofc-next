import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  banExpires: integer('ban_expires', { mode: 'timestamp_ms' }),
  banned: integer('banned', { mode: 'boolean' }).default(false),
  banReason: text('ban_reason'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  displayUsername: text('display_username'),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),
  id: text('id').primaryKey(),
  image: text('image'),
  name: text('name').notNull(),
  role: text('role').default('user'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  username: text('username').unique(),
});

export const session = sqliteTable('session', {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  id: text('id').primaryKey(),
  impersonatedBy: text('impersonated_by'),
  ipAddress: text('ip_address'),
  token: text('token').notNull().unique(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  accessToken: text('access_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', {
    mode: 'timestamp_ms',
  }),
  accountId: text('account_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  id: text('id').primaryKey(),
  idToken: text('id_token'),
  password: text('password'),
  providerId: text('provider_id').notNull(),
  refreshToken: text('refresh_token'),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', {
    mode: 'timestamp_ms',
  }),
  scope: text('scope'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const verification = sqliteTable('verification', {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  value: text('value').notNull(),
});

export const members = sqliteTable('members', {
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  assemblyNumber: text('assembly_number'),
  birthDate: text('birth_date'),
  cellPhone: text('cell_phone'),
  firstDegreeDate: text('first_degree_date'),
  firstName: text('first_name').notNull(),
  fourthDegreeDate: text('fourth_degree_date'),
  lastName: text('last_name').notNull(),
  memberClass: text('member_class'),
  membershipNumber: text('membership_number').primaryKey(),
  memberType: text('member_type'),
  middleName: text('middle_name'),
  nickname: text('nickname'),
  prefix: text('prefix'),
  primaryEmail: text('primary_email'),
  residencePhone: text('residence_phone'),
  secondDegreeDate: text('second_degree_date'),
  suffix: text('suffix'),
  syncedAt: integer('synced_at', { mode: 'timestamp_ms' }).notNull(),
  thirdDegreeDate: text('third_degree_date'),
});

export const permissions = sqliteTable('permissions', {
  key: text('key').primaryKey(),
  membershipNumbers: text('membership_numbers').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const events = sqliteTable('events', {
  allDay: integer('all_day', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  createdBy: text('created_by'),
  description: text('description'),
  endAt: integer('end_at', { mode: 'timestamp_ms' }),
  id: text('id').primaryKey(),
  location: text('location'),
  recurrenceRule: text('recurrence_rule'),
  startAt: integer('start_at', { mode: 'timestamp_ms' }).notNull(),
  title: text('title').notNull(),
  type: text('type', { enum: ['council', 'member'] }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const duesRates = sqliteTable('dues_rates', {
  amountCents: integer('amount_cents').notNull(),
  councilYear: text('council_year').notNull(),
  memberClass: text('member_class').primaryKey(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const duesPayments = sqliteTable('dues_payments', {
  amountCents: integer('amount_cents').notNull(),
  councilYear: text('council_year').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  id: text('id').primaryKey(),
  markedByMembershipNumber: text('marked_by_membership_number'),
  memberClass: text('member_class').notNull(),
  membershipNumber: text('membership_number')
    .notNull()
    .references(() => members.membershipNumber),
  method: text('method', { enum: ['paypal', 'cash', 'check', 'other'] }),
  notes: text('notes'),
  paidAt: integer('paid_at', { mode: 'timestamp_ms' }).notNull(),
  payerEmail: text('payer_email'),
  paypalSubscriptionId: text('paypal_subscription_id'),
  paypalTxnId: text('paypal_txn_id').unique(),
  source: text('source', {
    enum: ['paypal_ipn', 'paypal_subscription', 'manual'],
  }).notNull(),
  status: text('status', { enum: ['completed', 'refunded'] })
    .default('completed')
    .notNull(),
});

export const duesSubscriptions = sqliteTable('dues_subscriptions', {
  amountCents: integer('amount_cents').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  id: text('id').primaryKey(),
  lastPaymentAt: integer('last_payment_at', { mode: 'timestamp_ms' }),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
  memberClass: text('member_class').notNull(),
  membershipNumber: text('membership_number')
    .notNull()
    .references(() => members.membershipNumber),
  nextBillingAt: integer('next_billing_at', { mode: 'timestamp_ms' }),
  payerEmail: text('payer_email'),
  paypalPlanId: text('paypal_plan_id').notNull(),
  paypalSubscriptionId: text('paypal_subscription_id').notNull().unique(),
  status: text('status', {
    enum: [
      'approval_pending',
      'approved',
      'active',
      'suspended',
      'cancelled',
      'expired',
    ],
  }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const calendarTokens = sqliteTable('calendar_tokens', {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  feed: text('feed').notNull(),
  id: text('id').primaryKey(),
  membershipNumber: text('membership_number')
    .notNull()
    .references(() => members.membershipNumber),
  tokenHash: text('token_hash').notNull(),
});

export const registrationTokens = sqliteTable('registration_tokens', {
  code: text('code').notNull(),
  email: text('email').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  id: text('id').primaryKey(),
  membershipNumber: text('membership_number').notNull(),
  usedAt: integer('used_at', { mode: 'timestamp_ms' }),
});

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const photoGalleries = sqliteTable('photo_galleries', {
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
  allowMemberUploads: integer('allow_member_uploads', { mode: 'boolean' })
    .default(true)
    .notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  createdBy: text('created_by'),
  description: text('description'),
  id: text('id').primaryKey(),
  immichAlbumId: text('immich_album_id').notNull().unique(),
  title: text('title').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const gallerySubmissions = sqliteTable('gallery_submissions', {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  filename: text('filename'),
  galleryId: text('gallery_id')
    .notNull()
    .references(() => photoGalleries.id, { onDelete: 'cascade' }),
  id: text('id').primaryKey(),
  immichAssetId: text('immich_asset_id').notNull(),
  membershipNumber: text('membership_number')
    .notNull()
    .references(() => members.membershipNumber),
});

export const auditLog = sqliteTable('audit_log', {
  action: text('action').notNull(),
  actorMembershipNumber: text('actor_membership_number'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  id: text('id').primaryKey(),
  metadata: text('metadata'),
  summary: text('summary').notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const authSchema = {
  account,
  session,
  user,
  verification,
};
