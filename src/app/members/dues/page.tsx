export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getMemberPaymentStatus, isPayPalConfigured } from '@/lib/dues';
import { requireMembershipNumber } from '@/lib/session';
import { centsToDollars } from '@/lib/utils';

export default async function MemberDuesPage() {
  const membershipNumber = await requireMembershipNumber();
  const status = await getMemberPaymentStatus(membershipNumber);

  return (
    <div className='grid gap-4 max-w-xl'>
      <h1 className='text-2xl font-bold'>Your Dues</h1>
      <p>Council year: {status.councilYear ?? 'Unknown'}</p>
      <p>
        Amount:{' '}
        {status.amountCents != null
          ? `$${centsToDollars(status.amountCents)}`
          : 'Unavailable'}
      </p>
      <p>Status: {status.paid ? 'Paid' : 'Unpaid'}</p>
      {status.payment ? (
        <p>
          Paid {new Date(status.payment.paidAt).toLocaleDateString()} via{' '}
          {status.payment.method ?? status.payment.source}
        </p>
      ) : null}
      {!status.paid && isPayPalConfigured() ? (
        <Link
          href={`/dues/pay?member=${membershipNumber}`}
          className='underline'
        >
          Pay dues with PayPal
        </Link>
      ) : null}
    </div>
  );
}
