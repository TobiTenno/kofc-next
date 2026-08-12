'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import type { MemberNavGroups, MemberNavMeta } from '@/lib/member-nav';

import { MemberNavMetaPanel } from '@/components/MemberNavMetaPanel';
import { SignOutButton } from '@/components/SignOutButton';
import { ThemeToggle } from '@/components/ThemeToggle';

type NavLink = {
  href: string;
  label: string;
  prefetch?: boolean;
};

type SiteNavProps = {
  councilName?: string;
  memberLinks?: MemberNavGroups | null;
  memberMeta?: MemberNavMeta | null;
  membershipNumber: null | string;
  showPayDuesLink?: boolean;
};

const navLinks = (
  membershipNumber: null | string,
  showPayDuesLink: boolean,
): NavLink[] => [
  { href: '/officers', label: 'Officers' },
  { href: '/about', label: 'About the Council' },
  { href: '/calendar', label: 'Calendar', prefetch: false },
  ...(showPayDuesLink ? [{ href: '/dues/pay', label: 'Pay Dues' }] : []),
  ...(membershipNumber ? [] : [{ href: '/members/login', label: 'Sign in' }]),
];

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg
    aria-hidden
    className='h-6 w-6'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    viewBox='0 0 24 24'
  >
    {open
      ? (
          <path d='M6 6l12 12M18 6L6 18' strokeLinecap='round' />
        )
      : (
          <path d='M4 7h16M4 12h16M4 17h16' strokeLinecap='round' />
        )}
  </svg>
);

export const SiteNav = ({
  councilName,
  memberLinks = null,
  memberMeta = null,
  membershipNumber,
  showPayDuesLink = false,
}: SiteNavProps) => {
  const pathname = usePathname();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const links = navLinks(membershipNumber, showPayDuesLink);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (menuOpen) {
      setMenuOpen(false);
    }
  }

  const isActivePath = (href: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const desktopLinkClass
    = 'rounded-lg px-3 py-2 text-base font-semibold text-white hover:bg-white/10 hover:text-white active:bg-white/15 whitespace-nowrap';
  const mobileLinkClass
    = 'inline-flex min-h-11 w-full items-center rounded-lg px-3 py-3 text-base font-semibold text-white/90 visited:text-white/90 hover:bg-white/10 hover:text-white active:bg-white/15 aria-[current=page]:bg-white/15 aria-[current=page]:text-white touch-manipulation';
  const mobileSignOutClass
    = 'inline-flex min-h-11 w-full items-center rounded-lg px-3 py-3 text-base font-semibold text-white/70 hover:bg-red-500/20 hover:text-white active:bg-red-500/30 touch-manipulation whitespace-nowrap disabled:opacity-60';

  const mobileMenu = menuOpen
    ? (
        <div
          aria-label='Site menu'
          aria-modal='true'
          className='fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-blue-950 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] text-white dark:bg-gray-950 sm:px-6 lg:hidden'
          id={menuId}
          role='dialog'
        >
          <ul className='flex flex-col gap-0.5'>
            {links.map(link => (
              <li key={link.href}>
                <Link
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className={mobileLinkClass}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  prefetch={link.prefetch}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {memberLinks && memberLinks.member.length > 0
              ? (
                  <>
                    <li
                      aria-hidden
                      className='mt-2 border-t border-white/10 px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/50'
                    >
                      Portal
                    </li>
                    {memberLinks.member.map(link => (
                      <li key={link.href}>
                        <Link
                          aria-current={isActivePath(link.href) ? 'page' : undefined}
                          className={mobileLinkClass}
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </>
                )
              : null}
            {memberLinks && memberLinks.admin.length > 0
              ? (
                  <>
                    <li
                      aria-hidden
                      className='mt-2 border-t border-white/10 px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/50'
                    >
                      Admin
                    </li>
                    {memberLinks.admin.map(link => (
                      <li key={link.href}>
                        <Link
                          aria-current={isActivePath(link.href) ? 'page' : undefined}
                          className={mobileLinkClass}
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </>
                )
              : null}
            {membershipNumber
              ? (
                  <li className='mt-2 border-t border-white/10 pt-1'>
                    <SignOutButton
                      className={mobileSignOutClass}
                      onSignOut={() => setMenuOpen(false)}
                    />
                  </li>
                )
              : null}
          </ul>
        </div>
      )
    : null;

  return (
    <>
      <nav
        aria-label='Global'
        className='relative z-[100] flex w-full items-center gap-2 px-3 py-2 sm:px-6 lg:justify-between lg:gap-3 lg:px-8 lg:py-4'
      >
        <div className='flex min-w-0 flex-1 items-center gap-2 lg:flex-none'>
          <Link className='shrink-0 -m-1 p-1 touch-manipulation' href='/'>
            <span className='sr-only'>
              Council
              {councilName}
            </span>
            <Image
              alt={`${councilName ?? 'Council'} Logo`}
              className='h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12'
              height={48}
              src='/kofc_r_emblem_rgb_rev.png'
              width={48}
            />
          </Link>
          {memberMeta
            ? (
                <MemberNavMetaPanel
                  className='min-w-0 lg:hidden'
                  meta={memberMeta}
                  variant='header'
                />
              )
            : null}
        </div>

        <div className='hidden lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-x-3 lg:gap-y-2'>
          {links.map(link => (
            <Link
              className={desktopLinkClass}
              href={link.href}
              key={link.href}
              prefetch={link.prefetch}
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>

        <div className='flex shrink-0 items-center gap-2 lg:hidden'>
          <ThemeToggle compact />
          <button
            aria-controls={menuId}
            aria-expanded={menuOpen}
            className='inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-white/10 active:bg-white/15 lg:hidden touch-manipulation'
            onClick={() => setMenuOpen(open => !open)}
            type='button'
          >
            <span className='sr-only'>
              {menuOpen ? 'Close menu' : 'Open menu'}
            </span>
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </nav>

      {mounted && mobileMenu ? createPortal(mobileMenu, document.body) : null}
    </>
  );
};
