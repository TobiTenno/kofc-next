export const dynamic = 'force-dynamic';

import { PublicCalendarContent } from '@/components/calendar/PublicCalendarContent';
import { getCanonicalAppOrigin, getLocalDevOrigin } from '@/lib/app-origin';
import {
  loadCalendarPreviewEvents,
  serializeCalendarPreviewEvents,
} from '@/lib/calendar/display-events';
import { mintCalendarToken } from '@/lib/calendar/tokens';
import { getMembershipNumber } from '@/lib/session';

export default async function PublicCalendarPage() {
  const membershipNumber = await getMembershipNumber();
  const signedIn = Boolean(membershipNumber);
  const baseUrl = getCanonicalAppOrigin() ?? getLocalDevOrigin();
  const token = membershipNumber
    ? await mintCalendarToken({ membershipNumber, feed: 'birthdays' })
    : null;
  const birthdayUrl = token
    ? `${baseUrl}/api/calendar/birthdays.ics?token=${token}`
    : null;
  const events = serializeCalendarPreviewEvents(
    await loadCalendarPreviewEvents({ includeBirthdays: signedIn }),
  );

  return (
    <PublicCalendarContent
      baseUrl={baseUrl}
      initialEvents={events}
      initialSignedIn={signedIn}
      initialBirthdayUrl={birthdayUrl}
    />
  );
}
