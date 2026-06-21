'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MemberNavMetaPanel } from '@/components/MemberNavMetaPanel';
import { signOutAndRedirect } from '@/lib/member-auth';
import type { MemberNavContext } from '@/lib/member-nav';

type MemberSubNavProps = {
  context: MemberNavContext;
};

const isActivePath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

const linkClass = (active: boolean): string =>
  [
    'inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors touch-manipulation whitespace-nowrap',
    active
      ? 'bg-white/15 text-white'
      : 'text-white/80 hover:bg-white/10 hover:text-white active:bg-white/15',
  ].join(' ');

const SignOutButton = () => {
  const [signingOut, setSigningOut] = useState(false);

  const signOut = (): void => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    void signOutAndRedirect('/');
  };

  return (
    <button
      type='button'
      onClick={signOut}
      disabled={signingOut}
      className='inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-white active:bg-red-500/30 touch-manipulation whitespace-nowrap disabled:opacity-60'
    >
      {signingOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
};

export const MemberSubNav = ({ context }: MemberSubNavProps) => {
  const pathname = usePathname();
  const { links, meta } = context;

  return (
    <nav
      aria-label='Member portal'
      className='border-t border-white/10 text-white'
    >
      <div className='border-b border-white/10 px-4 py-2.5 lg:hidden'>
        <MemberNavMetaPanel meta={meta} compact />
        <div className='mt-2 flex justify-end'>
          <SignOutButton />
        </div>
      </div>

      <div className='overflow-x-auto lg:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        <div className='mx-auto flex max-w-7xl min-w-0 flex-col gap-2 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-4 lg:px-8'>
          <div className='flex min-w-0 flex-col gap-2'>
            <div className='flex min-w-min flex-wrap items-center gap-1 lg:min-w-0'>
              <span className='mr-1 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/50'>
                Portal
              </span>
              {links.member.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={
                    isActivePath(pathname, link.href) ? 'page' : undefined
                  }
                  className={linkClass(isActivePath(pathname, link.href))}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {links.admin.length > 0 ? (
              <div className='flex min-w-min flex-wrap items-center gap-1 border-t border-white/10 pt-2 lg:min-w-0'>
                <span className='mr-1 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/50'>
                  Admin
                </span>
                {links.admin.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={
                      isActivePath(pathname, link.href) ? 'page' : undefined
                    }
                    className={linkClass(isActivePath(pathname, link.href))}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className='hidden shrink-0 items-center gap-3 lg:flex'>
            <MemberNavMetaPanel meta={meta} />
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  );
};
