'use client';

import { Button } from '@heroui/react';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';

type ImpersonationBannerProps = {
  displayName: string;
  membershipNumber: string;
};

export const ImpersonationBanner = ({
  displayName,
  membershipNumber,
}: ImpersonationBannerProps) => {
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<null | string>(null);

  const stop = async (): Promise<void> => {
    setStopping(true);
    setError(null);

    try {
      await fetch('/api/members/admin/impersonate/stop', { method: 'POST' });
      const { error: stopError } = await authClient.admin.stopImpersonating();
      if (stopError) {
        setError(stopError.message ?? 'Could not stop impersonating');
        setStopping(false);
        return;
      }
      // Full load so banner / nav clear with restored admin session.
      location.replace('/members');
    }
    catch {
      setError('Could not stop impersonating');
      setStopping(false);
    }
  };

  return (
    <div
      className='mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-950 dark:text-amber-100'
      role='status'
    >
      <p>
        Impersonating
        {' '}
        <strong>{displayName}</strong>
        {' '}
        (#
        {membershipNumber}
        )
        {error ? <span className='mt-1 block text-danger'>{error}</span> : null}
      </p>
      <Button
        isDisabled={stopping}
        onPress={() => {
          void stop();
        }}
        size='sm'
        variant='secondary'
      >
        {stopping ? 'Stopping…' : 'Stop impersonating'}
      </Button>
    </div>
  );
};
