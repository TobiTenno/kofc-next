export const dynamic = 'force-dynamic';

import { CalendarDefaultRedirect } from '@/components/calendar/CalendarDefaultRedirect';

export default function MembersCalendarPage() {
  return <CalendarDefaultRedirect basePath='/members/calendar' />;
}
