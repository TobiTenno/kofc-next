'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { maskMemberName } from '@/lib/utils';

type LookupResult = {
  amountCents: number;
  councilYear: string;
  member: {
    firstName: string;
    lastName: string;
    memberClass: null | string;
    membershipNumber: string;
  };
  paypalBusinessEmail: string;
  subscribeAvailable?: boolean;
};

export default function PayDuesForm({ appUrl }: { appUrl: string }) {
  const searchParams = useSearchParams();
  const memberPreset = searchParams.get('member') ?? '';
  const [membershipNumber, setMembershipNumber] = useState(memberPreset);
  const [prevMemberPreset, setPrevMemberPreset] = useState(memberPreset);
  const [lastName, setLastName] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [subscribeBusy, setSubscribeBusy] = useState(false);

  if (memberPreset !== prevMemberPreset) {
    setPrevMemberPreset(memberPreset);
    setMembershipNumber(memberPreset);
  }

  const lookup = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setResult(null);

    const response = await fetch('/api/dues/lookup', {
      body: JSON.stringify({ lastName, membershipNumber }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
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

  const startSubscribe = async (): Promise<void> => {
    if (!result) {
      return;
    }
    setSubscribeBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/dues/subscribe', {
        body: JSON.stringify({
          lastName,
          membershipNumber: result.member.membershipNumber,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = (await response.json()) as {
        approveUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.approveUrl) {
        setError(payload.error ?? 'Could not start subscription');
        return;
      }
      location.assign(payload.approveUrl);
    }
    finally {
      setSubscribeBusy(false);
    }
  };

  const baseUrl = appUrl.replace(/\/$/, '');

  return (
    <div className='grid gap-4'>
      <form className='grid gap-3' onSubmit={lookup}>
        <label className='grid gap-1'>
          <span>Membership number</span>
          <input
            className='border rounded px-3 py-2'
            onChange={event => setMembershipNumber(event.target.value)}
            required
            value={membershipNumber}
          />
        </label>
        <label className='grid gap-1'>
          <span>Last name (confirmation)</span>
          <input
            className='border rounded px-3 py-2'
            onChange={event => setLastName(event.target.value)}
            required
            value={lastName}
          />
        </label>
        <button
          className='rounded bg-blue-900 text-white px-4 py-2 w-fit'
          type='submit'
        >
          Look up dues
        </button>
      </form>
      {error ? <p className='text-red-600'>{error}</p> : null}
      {result
        ? (
            <div className='grid gap-3 border rounded p-4'>
              <p>
                Member:
                {' '}
                {maskMemberName({
                  firstName: result.member.firstName,
                  lastName: result.member.lastName,
                })}
              </p>
              <p>
                Amount: $
                {(result.amountCents / 100).toFixed(2)}
                {' '}
                (
                {result.councilYear}
                )
              </p>
              <div className='grid gap-3 sm:grid-cols-2'>
                <form
                  action='https://www.paypal.com/cgi-bin/webscr'
                  className='grid gap-2'
                  method='post'
                  target='_top'
                >
                  <input name='cmd' type='hidden' value='_xclick' />
                  <input
                    name='business'
                    type='hidden'
                    value={result.paypalBusinessEmail}
                  />
                  <input
                    name='amount'
                    type='hidden'
                    value={(result.amountCents / 100).toFixed(2)}
                  />
                  <input name='currency_code' type='hidden' value='USD' />
                  <input
                    name='item_name'
                    type='hidden'
                    value={`Council dues ${result.councilYear}`}
                  />
                  <input
                    name='custom'
                    type='hidden'
                    value={`${result.member.membershipNumber}|${result.councilYear}`}
                  />
                  <input
                    name='notify_url'
                    type='hidden'
                    value={`${baseUrl}/api/dues/ipn`}
                  />
                  <input
                    name='return'
                    type='hidden'
                    value={`${baseUrl}/dues/thank-you`}
                  />
                  <p className='text-sm text-muted-foreground'>Pay once</p>
                  <input
                    alt='Pay with PayPal'
                    src='https://www.paypalobjects.com/en_US/i/btn/btn_payNow_LG.gif'
                    type='image'
                  />
                </form>
                {result.subscribeAvailable
                  ? (
                      <div className='grid gap-2 content-start'>
                        <p className='text-sm text-muted-foreground'>
                          Subscribe (auto-renew annually)
                        </p>
                        <button
                          className='rounded bg-blue-900 px-4 py-2 text-white w-fit disabled:opacity-60'
                          disabled={subscribeBusy}
                          onClick={() => void startSubscribe()}
                          type='button'
                        >
                          {subscribeBusy ? 'Starting…' : 'Subscribe with PayPal'}
                        </button>
                      </div>
                    )
                  : null}
              </div>
            </div>
          )
        : null}
    </div>
  );
}
