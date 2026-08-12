'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'complete' | 'verify'>('verify');
  const [membershipNumber, setMembershipNumber] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/register/verify', {
      body: JSON.stringify({ email, membershipNumber }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? 'Verification failed');
      return;
    }

    setStep('complete');
  };

  const complete = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/register/complete', {
      body: JSON.stringify({ code, email, membershipNumber, password }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? 'Registration failed');
      return;
    }

    router.push('/members/login');
  };

  return (
    <div className='w-full max-w-md mx-auto'>
      <h1 className='text-2xl font-bold mb-4'>Member Registration</h1>
      {step === 'verify'
        ? (
            <form className='flex flex-col gap-4' onSubmit={sendCode}>
              <label className='flex flex-col gap-1'>
                <span>Membership number</span>
                <input
                  className='border rounded px-3 py-2'
                  onChange={event => setMembershipNumber(event.target.value)}
                  required
                  value={membershipNumber}
                />
              </label>
              <label className='flex flex-col gap-1'>
                <span>Primary email (from roster)</span>
                <input
                  className='border rounded px-3 py-2'
                  onChange={event => setEmail(event.target.value)}
                  required
                  type='email'
                  value={email}
                />
              </label>
              {error ? <p className='text-red-600'>{error}</p> : null}
              <button
                className='rounded bg-blue-900 text-white px-4 py-2 disabled:opacity-50'
                disabled={loading}
                type='submit'
              >
                {loading ? 'Sending…' : 'Send verification code'}
              </button>
            </form>
          )
        : (
            <form className='flex flex-col gap-4' onSubmit={complete}>
              <label className='flex flex-col gap-1'>
                <span>Verification code</span>
                <input
                  className='border rounded px-3 py-2'
                  onChange={event => setCode(event.target.value)}
                  required
                  value={code}
                />
              </label>
              <label className='flex flex-col gap-1'>
                <span>Password</span>
                <input
                  className='border rounded px-3 py-2'
                  onChange={event => setPassword(event.target.value)}
                  required
                  type='password'
                  value={password}
                />
              </label>
              {error ? <p className='text-red-600'>{error}</p> : null}
              <button
                className='rounded bg-blue-900 text-white px-4 py-2 disabled:opacity-50'
                disabled={loading}
                type='submit'
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
    </div>
  );
}
