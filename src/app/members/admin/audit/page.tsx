'use client';

import { Alert } from '@heroui/react';
import { useEffect, useState } from 'react';
import { AdminPageSurface } from '@/components/AdminPageSurface';
import {
  type AuditEventRow,
  AuditLogTable,
} from '@/components/audit/AuditLogTable';

export default function AuditAdminPage() {
  const [events, setEvents] = useState<AuditEventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/members/admin/audit')
      .then(async (response) => {
        const payload = (await response.json()) as {
          events?: AuditEventRow[];
          error?: string;
        };
        if (!response.ok) {
          setError(payload.error ?? 'Could not load audit log');
          return;
        }
        setEvents(payload.events ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminPageSurface
      title='Audit Log'
      description='Recent admin and member actions across the council site.'
      maxWidth='full'
    >
      {error ? (
        <Alert status='danger'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {loading ? (
        <p className='text-sm text-muted-foreground'>Loading…</p>
      ) : (
        <AuditLogTable events={events} />
      )}
    </AdminPageSurface>
  );
}
