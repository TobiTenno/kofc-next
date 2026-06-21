export const dynamic = 'force-dynamic';

import { CalendarPreview } from '@/components/calendar/CalendarPreview';
import { CalendarSubscribeLinks } from '@/components/calendar/CalendarSubscribeLinks';
import { getCanonicalAppOrigin } from '@/lib/app-origin';
import {
  loadCalendarPreviewEvents,
  serializeCalendarPreviewEvents,
} from '@/lib/calendar/display-events';

export default async function PublicCalendarPage() {
  const baseUrl = getCanonicalAppOrigin() ?? 'http://localhost:3000';
  const events = serializeCalendarPreviewEvents(
    await loadCalendarPreviewEvents(),
  );

  return (
    <section className='flex w-full flex-col gap-6'>
      <div className='grid gap-2'>
        <h1 className='text-2xl font-bold'>Council Calendar</h1>
        <p className='text-sm opacity-80'>
          Preview council and member events. Subscribe via .ics links below.
        </p>
      </div>
      <CalendarPreview events={events} />
      <CalendarSubscribeLinks baseUrl={baseUrl} />
      <p className='text-sm'>
        Member birthdays are available after{' '}
        <a className='underline' href='/members/login'>
          login
        </a>
        .
      </p>
    </section>
  );
}
