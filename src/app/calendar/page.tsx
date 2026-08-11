export const dynamic = 'force-dynamic';

import { CalendarDefaultRedirect } from '@/components/calendar/CalendarDefaultRedirect';

export default function PublicCalendarPage() {
  return <CalendarDefaultRedirect basePath='/calendar' />;
}
