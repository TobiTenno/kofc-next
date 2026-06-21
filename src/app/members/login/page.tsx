'use client';

import { Alert, Button, Link as HeroLink } from '@heroui/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { isLoopbackHost } from '@/lib/app-origin';
import { authClient } from '@/lib/auth-client';

const fieldLabelClass = 'text-sm font-medium text-foreground';
const inputClass =
  'input input--primary input--full-width min-h-10 text-foreground';

const useCanonicalOriginRedirect = (): void => {
  useEffect(() => {
    const canonical = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!canonical) {
      return;
    }

    try {
      const canonicalUrl = new URL(canonical);
      if (
        window.location.origin !== canonicalUrl.origin &&
        isLoopbackHost(window.location.hostname) &&
        !isLoopbackHost(canonicalUrl.hostname)
      ) {
        const target = new URL(
          `${window.location.pathname}${window.location.search}`,
          canonicalUrl.origin,
        );
        window.location.replace(target.href);
      }
    } catch {
      // ignore invalid canonical URL
    }
  }, []);
};

const LoginForm = () => {
  useCanonicalOriginRedirect();
  const searchParams = useSearchParams();
  const [membershipNumber, setMembershipNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await authClient.signIn.username({
      username: membershipNumber.trim(),
      password,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? 'Login failed');
      return;
    }

    const next = searchParams.get('next') ?? '/';
    window.location.assign(next);
  };

  return (
    <form onSubmit={submit} className='grid gap-4'>
      <div className='grid gap-1.5'>
        <label htmlFor='membership-number' className={fieldLabelClass}>
          Membership number
        </label>
        <input
          id='membership-number'
          type='text'
          inputMode='numeric'
          autoComplete='username'
          required
          value={membershipNumber}
          onChange={(event) => setMembershipNumber(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className='grid gap-1.5'>
        <label htmlFor='membership-password' className={fieldLabelClass}>
          Password
        </label>
        <input
          id='membership-password'
          type='password'
          autoComplete='current-password'
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      {error ? (
        <Alert status='danger'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Button type='submit' variant='primary' isDisabled={loading} fullWidth>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
};

export default function LoginPage() {
  return (
    <div className='mx-auto w-full max-w-md'>
      <h1 className='mb-4 text-2xl font-bold'>Member Login</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className='mt-4 text-sm text-muted-foreground'>
        Need an account?{' '}
        <HeroLink
          href='/members/register'
          className='underline underline-offset-2'
        >
          Register
        </HeroLink>
      </p>
    </div>
  );
}
