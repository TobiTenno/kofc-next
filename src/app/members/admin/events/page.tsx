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

import { AdminPageSurface } from '@/components/AdminPageSurface';

type EventRow = {
  id: string;
  startAt: string;
  title: string;
  type: 'council' | 'member';
};

type EventType = EventRow['type'];

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [type, setType] = useState<EventType>('council');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<null | string>(null);
  const [messageTone, setMessageTone] = useState<'danger' | 'success'>(
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
      body: JSON.stringify({ allDay: false, startAt, title, type }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (response.ok) {
      setMessageTone('success');
      setMessage('Event created');
      setTitle('');
      setStartAt('');
      setType('council');
      await load();
    }
    else {
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
    <AdminPageSurface title='Events Admin'>
      <Card>
        <Card.Header>
          <Card.Title>New event</Card.Title>
          <Card.Description className='text-foreground/85'>
            Add a council or member calendar event.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form className='grid gap-4' onSubmit={create}>
            <TextField fullWidth isRequired onChange={setTitle} value={title}>
              <Label>Title</Label>
              <Input />
            </TextField>

            <TextField
              fullWidth
              isRequired
              onChange={setStartAt}
              value={startAt}
            >
              <Label>Start</Label>
              <Input type='datetime-local' />
            </TextField>

            <Select
              fullWidth
              onSelectionChange={(key) => {
                if (key == null) {
                  return;
                }
                setType(String(key) as EventType);
              }}
              selectedKey={type}
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
              fullWidth
              isDisabled={submitting}
              type='submit'
              variant='primary'
            >
              {submitting ? 'Creating…' : 'Add event'}
            </Button>
          </Form>
        </Card.Content>
      </Card>

      <ul className='grid gap-3'>
        {events.map(event => (
          <Card key={event.id}>
            <Card.Content className='grid gap-2 pt-4'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <p className='font-semibold'>{event.title}</p>
                  <p className='text-sm text-muted-foreground'>
                    {event.type}
                    {' '}
                    —
                    {new Date(event.startAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  className='min-h-11 touch-manipulation'
                  onPress={() => void remove(event.id)}
                  size='sm'
                  variant='danger'
                >
                  Delete
                </Button>
              </div>
            </Card.Content>
          </Card>
        ))}
      </ul>

      {message
        ? (
            <Alert status={messageTone === 'success' ? 'success' : 'danger'}>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{message}</Alert.Description>
              </Alert.Content>
            </Alert>
          )
        : null}
    </AdminPageSurface>
  );
}
