import { desc } from 'drizzle-orm';

import { db } from '@/db';
import { auditLog } from '@/db/schema';
import { createId } from '@/lib/utils';

export type AuditEventInput = {
  action: string;
  actorMembershipNumber?: null | string;
  metadata?: Record<string, unknown>;
  summary: string;
};

export const recordAuditEvent = async (
  input: AuditEventInput,
): Promise<void> => {
  try {
    await db.insert(auditLog).values({
      action: input.action,
      actorMembershipNumber: input.actorMembershipNumber ?? null,
      createdAt: new Date(),
      id: createId(),
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      summary: input.summary,
    });
  }
  catch (error) {
    console.error('Failed to record audit event', {
      action: input.action,
      error,
    });
  }
};

export const listAuditEvents = async (
  limit = 100,
): Promise<(typeof auditLog.$inferSelect)[]> =>
  db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
