'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

type SiteNavProps = {
  councilName?: string;
  membershipNumber: string | null;
  showPayDuesLink?: boolean;
};

type NavLink = {
  href: string;
  label: string;
  prefetch?: boolean;
};

const navLinks = (
  membershipNumber: string | null,
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
    viewBox='0 0 24 24'
    stroke='currentColor'
    strokeWidth={2}
  >
    {open ? (
      <path strokeLinecap='round' d='M6 6l12 12M18 6L6 18' />
    ) : (
      <path strokeLinecap='round' d='M4 7h16M4 12h16M4 17h16' />
    )}
  </svg>
);

export const SiteNav = ({
  councilName,
  membershipNumber,
  showPayDuesLink = false,
}: SiteNavProps) => {
  const pathname = usePathname();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = navLinks(membershipNumber, showPayDuesLink);

  useEffect(() => {
    setMenuOpen(false);
  }, []);

  const desktopLinkClass =
    'rounded-lg px-3 py-2 text-base font-semibold text-white hover:bg-white/10 hover:text-white active:bg-white/15 whitespace-nowrap';
  const mobileLinkClass =
    'inline-flex min-h-11 w-full items-center rounded-lg px-3 py-3 text-base font-semibold text-white/90 visited:text-white/90 hover:bg-white/10 hover:text-white active:bg-white/15 aria-[current=page]:bg-white/15 aria-[current=page]:text-white touch-manipulation';

  return (
    <>
      <nav
        aria-label='Global'
        className='flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8'
      >
        <Link href='/' className='shrink-0 -m-1 p-1 touch-manipulation'>
          <span className='sr-only'>Council {councilName}</span>
          <Image
            width={48}
            height={48}
            className='h-10 w-10 sm:h-12 sm:w-12'
            src='/kofc_r_emblem_rgb_rev.png'
            alt={`${councilName ?? 'Council'} Logo`}
          />
        </Link>

        <div className='hidden lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-x-3 lg:gap-y-2'>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={link.prefetch}
              className={desktopLinkClass}
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>

        <div className='flex items-center gap-2 lg:hidden'>
          <ThemeToggle compact />
          <button
            type='button'
            className='inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-white/10 active:bg-white/15 lg:hidden touch-manipulation'
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className='sr-only'>
              {menuOpen ? 'Close menu' : 'Open menu'}
            </span>
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id={menuId}
          className='border-t border-white/10 px-2 py-2 text-white lg:hidden'
        >
          <ul className='flex flex-col gap-0.5'>
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={link.prefetch}
                  className={mobileLinkClass}
                  aria-current={pathname === link.href ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
};
