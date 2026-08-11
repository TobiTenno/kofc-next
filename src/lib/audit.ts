import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { auditLog } from '@/db/schema';
import { createId } from '@/lib/utils';

export type AuditEventInput = {
  actorMembershipNumber?: string | null;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export const recordAuditEvent = async (
  input: AuditEventInput,
): Promise<void> => {
  try {
    await db.insert(auditLog).values({
      id: createId(),
      actorMembershipNumber: input.actorMembershipNumber ?? null,
      action: input.action,
      summary: input.summary,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt: new Date(),
    });
  } catch (error) {
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
