'use client';

import { useState } from 'react';

type MemberResult = {
  member: {
    membershipNumber: string;
    firstName: string;
    lastName: string;
    memberClass: string | null;
  };
  status: { paid: boolean };
  dues: { amountCents: number; councilYear: string } | null;
};

export default function DuesAdminPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberResult[]>([]);
  const [method, setMethod] = useState<'cash' | 'check' | 'paypal' | 'other'>(
    'cash',
  );
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const search = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const response = await fetch(
      `/api/members/admin/dues?q=${encodeURIComponent(query)}`,
    );
    const payload = (await response.json()) as { members?: MemberResult[] };
    setResults(payload.members ?? []);
  };

  const markPaid = async (membershipNumber: string): Promise<void> => {
    const response = await fetch('/api/members/admin/dues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipNumber, method, notes }),
    });

    const payload = (await response.json()) as { error?: string };
    setMessage(response.ok ? 'Marked paid' : (payload.error ?? 'Failed'));
    await search(new Event('submit') as unknown as React.FormEvent);
  };

  return (
    <div className='grid gap-6 max-w-3xl'>
      <h1 className='text-2xl font-bold'>Financial Secretary — Dues</h1>
      <form onSubmit={search} className='flex gap-3'>
        <input
          className='border rounded px-3 py-2'
          placeholder='Membership number or name'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type='submit'
          className='rounded bg-blue-900 text-white px-4 py-2'
        >
          Search
        </button>
      </form>
      <div className='grid gap-1'>
        <label htmlFor='dues-method'>Method</label>
        <select
          id='dues-method'
          className='border rounded px-3 py-2 w-fit'
          value={method}
          onChange={(event) =>
            setMethod(
              event.target.value as 'cash' | 'check' | 'paypal' | 'other',
            )
          }
        >
          <option value='cash'>Cash</option>
          <option value='check'>Check</option>
          <option value='paypal'>PayPal</option>
          <option value='other'>Other</option>
        </select>
        <input
          className='border rounded px-3 py-2'
          placeholder='Notes'
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      <ul className='grid gap-3'>
        {results.map((result) => (
          <li
            key={result.member.membershipNumber}
            className='border rounded p-4 grid gap-2'
          >
            <p>
              {result.member.firstName} {result.member.lastName} (
              {result.member.membershipNumber}) — class{' '}
              {result.member.memberClass}
            </p>
            <p>
              {result.status.paid
                ? 'Paid'
                : `Unpaid — $${((result.dues?.amountCents ?? 0) / 100).toFixed(2)}`}
            </p>
            {!result.status.paid ? (
              <button
                type='button'
                className='rounded bg-green-800 text-white px-4 py-2 w-fit'
                onClick={() => void markPaid(result.member.membershipNumber)}
              >
                Mark as paid
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
