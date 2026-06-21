import Link from 'next/link';
import type { ReactNode } from 'react';

type GalleryBackLinkProps = {
  href: string;
  children: ReactNode;
};

export const GalleryBackLink = ({ href, children }: GalleryBackLinkProps) => (
  <Link
    href={href}
    className='inline-flex w-fit items-center gap-1 text-sm underline underline-offset-2'
  >
    <svg
      viewBox='0 0 24 24'
      className='size-4 shrink-0'
      aria-hidden
      fill='currentColor'
    >
      <path d='M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z' />
    </svg>
    <span>{children}</span>
  </Link>
);
