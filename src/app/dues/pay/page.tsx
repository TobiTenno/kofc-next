import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import PayDuesForm from '@/components/PayDuesForm';
import { getCanonicalAppOrigin, getLocalDevOrigin } from '@/lib/app-origin';
import { isPayPalConfigured } from '@/lib/dues';

export default function PayDuesPage() {
  if (!isPayPalConfigured()) {
    notFound();
  }

  const appUrl = getCanonicalAppOrigin() ?? getLocalDevOrigin();

  return (
    <section className='w-full max-w-lg mx-auto grid gap-4'>
      <h1 className='text-2xl font-bold'>Pay Council Dues</h1>
      <p>No login required. Enter your membership number to pay online.</p>
      <Suspense>
        <PayDuesForm appUrl={appUrl} />
      </Suspense>
    </section>
  );
}
