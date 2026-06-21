import { NextResponse } from 'next/server';
import {
  getMemberDuesAmount,
  getPaypalBusinessEmail,
  recordPaypalPayment,
} from '@/lib/dues';

const verifyIpn = async (body: string): Promise<string> => {
  const response = await fetch('https://ipnpb.paypal.com/cgi-bin/webscr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `cmd=_notify-validate&${body}`,
  });

  return response.text();
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const rawBody = await request.text();
  const verification = await verifyIpn(rawBody);

  if (verification.trim() !== 'VERIFIED') {
    return new NextResponse('INVALID', { status: 400 });
  }

  const params = new URLSearchParams(rawBody);
  const paymentStatus = params.get('payment_status');
  const txnId = params.get('txn_id');
  const custom = params.get('custom');
  const payerEmail = params.get('payer_email') ?? undefined;
  const business = params.get('business') ?? params.get('receiver_email');
  const paypalBusinessEmail = getPaypalBusinessEmail();

  if (
    paymentStatus !== 'Completed' ||
    !txnId ||
    !custom ||
    !paypalBusinessEmail ||
    business !== paypalBusinessEmail
  ) {
    return new NextResponse('OK');
  }

  const [membershipNumber, councilYear] = custom.split('|');
  if (!membershipNumber || !councilYear) {
    return new NextResponse('OK');
  }

  const dues = await getMemberDuesAmount(membershipNumber);
  if (!dues) {
    return new NextResponse('OK');
  }

  await recordPaypalPayment({
    membershipNumber,
    councilYear,
    amountCents: dues.amountCents,
    memberClass: dues.memberClass,
    paypalTxnId: txnId,
    payerEmail,
  });

  return new NextResponse('OK');
};
