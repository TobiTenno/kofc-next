import { NextResponse } from 'next/server';
import { getCanonicalAppOrigin, getLocalDevOrigin } from '@/lib/app-origin';
import { loadSerializedCalendarPreviewEvents } from '@/lib/calendar/request-context';
import { mintCalendarToken } from '@/lib/calendar/tokens';
import { getMembershipNumber } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const GET = async (): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  const signedIn = Boolean(membershipNumber);
  const baseUrl = getCanonicalAppOrigin() ?? getLocalDevOrigin();
  const token = membershipNumber
    ? await mintCalendarToken({ membershipNumber, feed: 'birthdays' })
    : null;
  const birthdayUrl = token
    ? `${baseUrl}/api/calendar/birthdays.ics?token=${token}`
    : null;
  const { events, timeZone } = await loadSerializedCalendarPreviewEvents({
    includeBirthdays: signedIn,
  });

  return NextResponse.json({
    signedIn,
    events,
    birthdayUrl,
    baseUrl,
    timeZone,
  });
};
