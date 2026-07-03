export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { PublicCalendarContent } from '@/components/calendar/PublicCalendarContent';
import { getCanonicalAppOrigin, getLocalDevOrigin } from '@/lib/app-origin';
import {
  type CalendarViewSegment,
  isCalendarViewSegment,
} from '@/lib/calendar/calendar-view-path';
import { loadSerializedCalendarPreviewEvents } from '@/lib/calendar/request-context';
import { mintCalendarToken } from '@/lib/calendar/tokens';
import { getMembershipNumber } from '@/lib/session';

type PublicCalendarViewPageProps = {
  params: Promise<{ view: CalendarViewSegment }>;
};

export default async function PublicCalendarViewPage({
  params,
}: PublicCalendarViewPageProps) {
  const { view } = await params;

  if (!isCalendarViewSegment(view)) {
    notFound();
  }

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

  return (
    <PublicCalendarContent
      baseUrl={baseUrl}
      calendarBasePath='/calendar'
      initialEvents={events}
      initialSignedIn={signedIn}
      initialBirthdayUrl={birthdayUrl}
      serverTimeZone={timeZone}
    />
  );
}
