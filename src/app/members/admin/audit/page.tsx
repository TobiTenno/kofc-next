'use client';

import { Alert, Card } from '@heroui/react';
import { useEffect, useState } from 'react';

type AuditEventRow = {
  id: string;
  actorMembershipNumber: string | null;
  action: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string | Date;
};

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
    <div className='grid max-w-2xl gap-6'>
      <div className='grid gap-1'>
        <h1 className='text-2xl font-bold'>Audit Log</h1>
        <p className='text-sm text-muted-foreground'>
          Recent admin and member actions across the council site.
        </p>
      </div>

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
      ) : events.length === 0 ? (
        <Card>
          <Card.Content className='pt-4'>
            <p className='text-sm text-muted-foreground'>
              No audit events yet.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <ul className='grid gap-3'>
          {events.map((event) => (
            <Card key={event.id}>
              <Card.Content className='grid gap-1 pt-4'>
                <div className='flex flex-wrap items-baseline justify-between gap-2'>
                  <p className='font-semibold'>{event.summary}</p>
                  <p className='text-xs text-muted-foreground'>
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className='font-mono text-xs text-muted-foreground'>
                  {event.action}
                  {event.actorMembershipNumber
                    ? ` · ${event.actorMembershipNumber}`
                    : ' · system'}
                </p>
              </Card.Content>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
