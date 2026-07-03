export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { CalendarPreview } from '@/components/calendar/CalendarPreview';
import { CalendarSubscribeLinks } from '@/components/calendar/CalendarSubscribeLinks';
import { getCanonicalAppOrigin, getLocalDevOrigin } from '@/lib/app-origin';
import {
  type CalendarViewSegment,
  isCalendarViewSegment,
} from '@/lib/calendar/calendar-view-path';
import { loadSerializedCalendarPreviewEvents } from '@/lib/calendar/request-context';
import { mintCalendarToken } from '@/lib/calendar/tokens';
import { getMembershipNumber } from '@/lib/session';

type MembersCalendarViewPageProps = {
  params: Promise<{ view: CalendarViewSegment }>;
};

export default async function MembersCalendarViewPage({
  params,
}: MembersCalendarViewPageProps) {
  const { view } = await params;

  if (!isCalendarViewSegment(view)) {
    notFound();
  }

  const membershipNumber = await getMembershipNumber();
  const baseUrl = getCanonicalAppOrigin() ?? getLocalDevOrigin();
  const token = membershipNumber
    ? await mintCalendarToken({ membershipNumber, feed: 'birthdays' })
    : null;
  const birthdayUrl = token
    ? `${baseUrl}/api/calendar/birthdays.ics?token=${token}`
    : null;
  const { events, timeZone } = await loadSerializedCalendarPreviewEvents({
    includeBirthdays: true,
  });

  return (
    <div className='grid w-full gap-6'>
      <div className='grid gap-2'>
        <h1 className='text-2xl font-bold'>Member Calendar</h1>
        <p className='text-sm opacity-80'>
          Preview all council events, member events, and member birthdays.
        </p>
      </div>
      <CalendarPreview
        calendarBasePath='/members/calendar'
        events={events}
        refreshEventsFrom='/api/calendar/preview'
        serverTimeZone={timeZone}
        showBirthdayLegend
      />
      <CalendarSubscribeLinks baseUrl={baseUrl} birthdayUrl={birthdayUrl} />
    </div>
  );
}
