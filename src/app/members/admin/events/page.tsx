'use client';

import { useCallback, useEffect, useState } from 'react';

type EventRow = {
  id: string;
  title: string;
  type: 'council' | 'member';
  startAt: string;
};

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [type, setType] = useState<'council' | 'member'>('council');
  const [message, setMessage] = useState<string | null>(null);

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
    const response = await fetch('/api/members/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, startAt, type, allDay: false }),
    });

    setMessage(response.ok ? 'Event created' : 'Create failed');
    setTitle('');
    setStartAt('');
    await load();
  };

  const remove = async (id: string): Promise<void> => {
    await fetch(`/api/members/admin/events?id=${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className='grid gap-6 max-w-2xl'>
      <h1 className='text-2xl font-bold'>Events Admin</h1>
      <form onSubmit={create} className='grid gap-3 border rounded p-4'>
        <label className='grid gap-1'>
          <span>Title</span>
          <input
            className='border rounded px-3 py-2'
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className='grid gap-1'>
          <span>Start</span>
          <input
            type='datetime-local'
            className='border rounded px-3 py-2'
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            required
          />
        </label>
        <label className='grid gap-1'>
          <span>Type</span>
          <select
            className='border rounded px-3 py-2'
            value={type}
            onChange={(event) =>
              setType(event.target.value as 'council' | 'member')
            }
          >
            <option value='council'>Council</option>
            <option value='member'>Member</option>
          </select>
        </label>
        <button
          type='submit'
          className='rounded bg-blue-900 text-white px-4 py-2 w-fit'
        >
          Add event
        </button>
      </form>
      <ul className='grid gap-2'>
        {events.map((event) => (
          <li
            key={event.id}
            className='flex justify-between gap-4 border rounded p-3'
          >
            <span>
              {event.title} ({event.type}) —{' '}
              {new Date(event.startAt).toLocaleString()}
            </span>
            <button
              type='button'
              className='text-red-700 underline'
              onClick={() => void remove(event.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
