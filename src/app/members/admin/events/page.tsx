'use client';

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from '@heroui/react';
import { useCallback, useEffect, useState } from 'react';

type EventRow = {
  id: string;
  title: string;
  type: 'council' | 'member';
  startAt: string;
};

type EventType = EventRow['type'];

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [type, setType] = useState<EventType>('council');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );

  const load = useCallback(async (): Promise<void> => {
    const response = await fetch('/api/members/admin/events');
    const payload = (await response.json()) as { events?: EventRow[] };
    setEvents(payload.events ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const response = await fetch('/api/members/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, startAt, type, allDay: false }),
    });

    if (response.ok) {
      setMessageTone('success');
      setMessage('Event created');
      setTitle('');
      setStartAt('');
      setType('council');
      await load();
    } else {
      setMessageTone('danger');
      setMessage('Create failed');
    }

    setSubmitting(false);
  };

  const remove = async (id: string): Promise<void> => {
    await fetch(`/api/members/admin/events?id=${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className='grid max-w-2xl gap-6'>
      <h1 className='text-2xl font-bold'>Events Admin</h1>

      <Card>
        <Card.Header>
          <Card.Title>New event</Card.Title>
          <Card.Description className='text-foreground/85'>
            Add a council or member calendar event.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form onSubmit={create} className='grid gap-4'>
            <TextField fullWidth isRequired value={title} onChange={setTitle}>
              <Label>Title</Label>
              <Input />
            </TextField>

            <TextField
              fullWidth
              isRequired
              value={startAt}
              onChange={setStartAt}
            >
              <Label>Start</Label>
              <Input type='datetime-local' />
            </TextField>

            <Select
              fullWidth
              selectedKey={type}
              onSelectionChange={(key) => {
                if (key == null) {
                  return;
                }
                setType(String(key) as EventType);
              }}
            >
              <Label>Type</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id='council' textValue='Council'>
                    Council
                  </ListBox.Item>
                  <ListBox.Item id='member' textValue='Member'>
                    Member
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <Button
              type='submit'
              variant='primary'
              isDisabled={submitting}
              fullWidth
            >
              {submitting ? 'Creating…' : 'Add event'}
            </Button>
          </Form>
        </Card.Content>
      </Card>

      <ul className='grid gap-3'>
        {events.map((event) => (
          <Card key={event.id}>
            <Card.Content className='grid gap-2 pt-4'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <p className='font-semibold'>{event.title}</p>
                  <p className='text-sm text-muted-foreground'>
                    {event.type} — {new Date(event.startAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  size='sm'
                  variant='danger'
                  className='min-h-11 touch-manipulation'
                  onPress={() => void remove(event.id)}
                >
                  Delete
                </Button>
              </div>
            </Card.Content>
          </Card>
        ))}
      </ul>

      {message ? (
        <Alert status={messageTone === 'success' ? 'success' : 'danger'}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </div>
  );
}
