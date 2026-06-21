import type { ReactNode } from 'react';

export default function MembersLayout({ children }: { children: ReactNode }) {
  return <section className='flex w-full flex-col gap-6'>{children}</section>;
}
