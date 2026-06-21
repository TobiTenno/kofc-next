'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'verify' | 'complete'>('verify');
  const [membershipNumber, setMembershipNumber] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipNumber, email }),
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipNumber, email, code, password }),
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
      {step === 'verify' ? (
        <form onSubmit={sendCode} className='flex flex-col gap-4'>
          <label className='flex flex-col gap-1'>
            <span>Membership number</span>
            <input
              className='border rounded px-3 py-2'
              value={membershipNumber}
              onChange={(event) => setMembershipNumber(event.target.value)}
              required
            />
          </label>
          <label className='flex flex-col gap-1'>
            <span>Primary email (from roster)</span>
            <input
              type='email'
              className='border rounded px-3 py-2'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {error ? <p className='text-red-600'>{error}</p> : null}
          <button
            type='submit'
            disabled={loading}
            className='rounded bg-blue-900 text-white px-4 py-2 disabled:opacity-50'
          >
            {loading ? 'Sending…' : 'Send verification code'}
          </button>
        </form>
      ) : (
        <form onSubmit={complete} className='flex flex-col gap-4'>
          <label className='flex flex-col gap-1'>
            <span>Verification code</span>
            <input
              className='border rounded px-3 py-2'
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>
          <label className='flex flex-col gap-1'>
            <span>Password</span>
            <input
              type='password'
              className='border rounded px-3 py-2'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className='text-red-600'>{error}</p> : null}
          <button
            type='submit'
            disabled={loading}
            className='rounded bg-blue-900 text-white px-4 py-2 disabled:opacity-50'
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  );
}
