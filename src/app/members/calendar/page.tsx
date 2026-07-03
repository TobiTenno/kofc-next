export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { DEFAULT_CALENDAR_VIEW_SEGMENT } from '@/lib/calendar/calendar-view-path';

export default function MembersCalendarPage() {
  redirect(`/members/calendar/${DEFAULT_CALENDAR_VIEW_SEGMENT}`);
}
