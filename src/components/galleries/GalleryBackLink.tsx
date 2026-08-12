import type { ReactNode } from 'react';

import Link from 'next/link';

type GalleryBackLinkProps = {
  children: ReactNode;
  href: string;
};

export const GalleryBackLink = ({ children, href }: GalleryBackLinkProps) => (
  <Link
    className='inline-flex w-fit items-center gap-1 text-sm underline underline-offset-2'
    href={href}
  >
    <svg
      aria-hidden
      className='size-4 shrink-0'
      fill='currentColor'
      viewBox='0 0 24 24'
    >
      <path d='M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z' />
    </svg>
    <span>{children}</span>
  </Link>
);
