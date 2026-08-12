'use client';

import { Alert, Button, Link as HeroLink } from '@heroui/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { isLoopbackHost } from '@/lib/app-origin';
import { authClient } from '@/lib/auth-client';

const fieldLabelClass = 'text-sm font-medium text-foreground';
const inputClass
  = 'input input--primary input--full-width min-h-10 text-foreground';

const useCanonicalOriginRedirect = (): void => {
  useEffect(() => {
    const canonical = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!canonical) {
      return;
    }

    try {
      const canonicalUrl = new URL(canonical);
      if (
        location.origin !== canonicalUrl.origin
        && isLoopbackHost(location.hostname)
        && !isLoopbackHost(canonicalUrl.hostname)
      ) {
        const target = new URL(
          `${location.pathname}${location.search}`,
          canonicalUrl.origin,
        );
        location.replace(target.href);
      }
    }
    catch {
      // ignore invalid canonical URL
    }
  }, []);
};

const LoginForm = () => {
  useCanonicalOriginRedirect();
  const searchParams = useSearchParams();
  const [membershipNumber, setMembershipNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await authClient.signIn.username({
      password,
      username: membershipNumber.trim(),
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? 'Login failed');
      return;
    }

    const next = searchParams.get('next') ?? '/';
    location.assign(next);
  };

  return (
    <form className='grid gap-4' onSubmit={submit}>
      <div className='grid gap-1.5'>
        <label className={fieldLabelClass} htmlFor='membership-number'>
          Membership number
        </label>
        <input
          autoComplete='username'
          className={inputClass}
          id='membership-number'
          inputMode='numeric'
          onChange={event => setMembershipNumber(event.target.value)}
          required
          type='text'
          value={membershipNumber}
        />
      </div>

      <div className='grid gap-1.5'>
        <label className={fieldLabelClass} htmlFor='membership-password'>
          Password
        </label>
        <input
          autoComplete='current-password'
          className={inputClass}
          id='membership-password'
          onChange={event => setPassword(event.target.value)}
          required
          type='password'
          value={password}
        />
      </div>

      {error
        ? (
            <Alert status='danger'>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          )
        : null}

      <Button fullWidth isDisabled={loading} type='submit' variant='primary'>
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
        Need an account?
        {' '}
        <HeroLink
          className='underline underline-offset-2'
          href='/members/register'
        >
          Register
        </HeroLink>
      </p>
    </div>
  );
}
