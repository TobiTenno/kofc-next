'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MemberNavMetaPanel } from '@/components/MemberNavMetaPanel';
import { SignOutButton } from '@/components/SignOutButton';
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

export const MemberSubNav = ({ context }: MemberSubNavProps) => {
  const pathname = usePathname();
  const { links, meta } = context;

  return (
    <nav
      aria-label='Member portal'
      className='hidden border-t border-white/10 text-white lg:block'
    >
      <div className='mx-auto flex max-w-7xl min-w-0 flex-row items-start justify-between gap-4 px-8 py-2.5'>
        <div className='flex min-w-0 flex-col gap-2'>
          <div className='flex min-w-0 flex-wrap items-center gap-1'>
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
            <div className='flex min-w-0 flex-wrap items-center gap-1 border-t border-white/10 pt-2'>
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

        <div className='flex shrink-0 items-center gap-3'>
          <MemberNavMetaPanel meta={meta} />
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
};
