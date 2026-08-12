export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  getMemberPaymentStatus,
  getMemberSubscription,
  isDuesConfigured,
  isPayPalConfigured,
  isPayPalSubscribeConfigured,
} from '@/lib/dues';
import { requireMembershipNumber } from '@/lib/session';
import { centsToDollars } from '@/lib/utils';

export default async function MemberDuesPage() {
  const membershipNumber = await requireMembershipNumber();

  if (!(await isDuesConfigured())) {
    redirect('/members/calendar');
  }

  const status = await getMemberPaymentStatus(membershipNumber);
  const subscription = await getMemberSubscription(membershipNumber);

  return (
    <div className='grid max-w-xl gap-4'>
      <h1 className='text-2xl font-bold'>Your Dues</h1>
      <p>
        Council year:
        {status.councilYear ?? 'Unknown'}
      </p>
      <p>
        Amount:
        {' '}
        {status.amountCents == null
          ? 'Unavailable'
          : `$${centsToDollars(status.amountCents)}`}
      </p>
      <p>
        Status:
        {status.paid ? 'Paid' : 'Unpaid'}
      </p>
      {status.payment
        ? (
            <p>
              Paid
              {' '}
              {new Date(status.payment.paidAt).toLocaleDateString()}
              {' '}
              via
              {' '}
              {status.payment.method ?? status.payment.source}
            </p>
          )
        : null}
      {subscription
        ? (
            <div className='grid gap-1 text-sm'>
              <p>
                Subscription:
                {' '}
                <span className='font-medium'>{subscription.status}</span>
              </p>
              {subscription.nextBillingAt
                ? (
                    <p>
                      Next billing:
                      {' '}
                      {new Date(subscription.nextBillingAt).toLocaleDateString()}
                    </p>
                  )
                : null}
              {subscription.status === 'active'
                ? (
                    <p className='text-muted-foreground'>
                      To cancel, manage the subscription in your PayPal account.
                    </p>
                  )
                : null}
            </div>
          )
        : (isPayPalSubscribeConfigured()
            ? (
                <p className='text-sm text-muted-foreground'>
                  No auto-renew subscription yet. You can pay once or subscribe on the
                  pay page.
                </p>
              )
            : null)}
      {!status.paid && isPayPalConfigured()
        ? (
            <Link
              className='underline'
              href={`/dues/pay?member=${membershipNumber}`}
            >
              Pay dues with PayPal
            </Link>
          )
        : null}
    </div>
  );
}
