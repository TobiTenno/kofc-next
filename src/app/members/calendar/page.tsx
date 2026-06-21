export const dynamic = 'force-dynamic';

import { CalendarPreview } from '@/components/calendar/CalendarPreview';
import { CalendarSubscribeLinks } from '@/components/calendar/CalendarSubscribeLinks';
import { getCanonicalAppOrigin } from '@/lib/app-origin';
import {
  loadCalendarPreviewEvents,
  serializeCalendarPreviewEvents,
} from '@/lib/calendar/display-events';
import { mintCalendarToken } from '@/lib/calendar/tokens';
import { getMembershipNumber } from '@/lib/session';

export default async function MembersCalendarPage() {
  const membershipNumber = await getMembershipNumber();
  const baseUrl = getCanonicalAppOrigin() ?? 'http://localhost:3000';
  const token = membershipNumber
    ? await mintCalendarToken({ membershipNumber, feed: 'birthdays' })
    : null;
  const birthdayUrl = token
    ? `${baseUrl}/api/calendar/birthdays.ics?token=${token}`
    : null;
  const events = serializeCalendarPreviewEvents(
    await loadCalendarPreviewEvents({ includeBirthdays: true }),
  );

  return (
    <div className='grid w-full gap-6'>
      <div className='grid gap-2'>
        <h1 className='text-2xl font-bold'>Member Calendar</h1>
        <p className='text-sm opacity-80'>
          Preview all council events, member events, and member birthdays.
        </p>
      </div>
      <CalendarPreview events={events} showBirthdayLegend />
      <CalendarSubscribeLinks baseUrl={baseUrl} birthdayUrl={birthdayUrl} />
    </div>
  );
}
