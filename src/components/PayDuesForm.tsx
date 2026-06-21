'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { maskMemberName } from '@/lib/utils';

type LookupResult = {
  member: {
    membershipNumber: string;
    firstName: string;
    lastName: string;
    memberClass: string | null;
  };
  amountCents: number;
  councilYear: string;
  paypalBusinessEmail: string;
};

export default function PayDuesForm({ appUrl }: { appUrl: string }) {
  const searchParams = useSearchParams();
  const [membershipNumber, setMembershipNumber] = useState(
    searchParams.get('member') ?? '',
  );
  const [lastName, setLastName] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preset = searchParams.get('member');
    if (preset) {
      setMembershipNumber(preset);
    }
  }, [searchParams]);

  const lookup = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setResult(null);

    const response = await fetch('/api/dues/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipNumber, lastName }),
    });

    const payload = (await response.json()) as LookupResult & {
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? 'Lookup failed');
      return;
    }

    setResult(payload);
  };

  const baseUrl = appUrl.replace(/\/$/, '');

  return (
    <div className='grid gap-4'>
      <form onSubmit={lookup} className='grid gap-3'>
        <label className='grid gap-1'>
          <span>Membership number</span>
          <input
            className='border rounded px-3 py-2'
            value={membershipNumber}
            onChange={(event) => setMembershipNumber(event.target.value)}
            required
          />
        </label>
        <label className='grid gap-1'>
          <span>Last name (confirmation)</span>
          <input
            className='border rounded px-3 py-2'
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </label>
        <button
          type='submit'
          className='rounded bg-blue-900 text-white px-4 py-2 w-fit'
        >
          Look up dues
        </button>
      </form>
      {error ? <p className='text-red-600'>{error}</p> : null}
      {result ? (
        <div className='grid gap-3 border rounded p-4'>
          <p>
            Member:{' '}
            {maskMemberName({
              firstName: result.member.firstName,
              lastName: result.member.lastName,
            })}
          </p>
          <p>
            Amount: ${(result.amountCents / 100).toFixed(2)} (
            {result.councilYear})
          </p>
          <form
            action='https://www.paypal.com/cgi-bin/webscr'
            method='post'
            target='_top'
          >
            <input type='hidden' name='cmd' value='_xclick' />
            <input
              type='hidden'
              name='business'
              value={result.paypalBusinessEmail}
            />
            <input
              type='hidden'
              name='amount'
              value={(result.amountCents / 100).toFixed(2)}
            />
            <input type='hidden' name='currency_code' value='USD' />
            <input
              type='hidden'
              name='item_name'
              value={`Council dues ${result.councilYear}`}
            />
            <input
              type='hidden'
              name='custom'
              value={`${result.member.membershipNumber}|${result.councilYear}`}
            />
            <input
              type='hidden'
              name='notify_url'
              value={`${baseUrl}/api/dues/ipn`}
            />
            <input
              type='hidden'
              name='return'
              value={`${baseUrl}/dues/thank-you`}
            />
            <input
              type='image'
              src='https://www.paypalobjects.com/en_US/i/btn/btn_payNow_LG.gif'
              alt='Pay with PayPal'
            />
          </form>
        </div>
      ) : null}
    </div>
  );
}
