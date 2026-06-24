'use client';

import { useState } from 'react';
import { signOutAndRedirect } from '@/lib/member-auth';

type SignOutButtonProps = {
  className?: string;
  onSignOut?: () => void;
};

export const SignOutButton = ({
  className = 'inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-white active:bg-red-500/30 touch-manipulation whitespace-nowrap disabled:opacity-60',
  onSignOut,
}: SignOutButtonProps) => {
  const [signingOut, setSigningOut] = useState(false);

  const signOut = (): void => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    onSignOut?.();
    void signOutAndRedirect('/');
  };

  return (
    <button
      type='button'
      onClick={signOut}
      disabled={signingOut}
      className={className}
    >
      {signingOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
};
