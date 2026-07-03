import { cookies, headers } from 'next/headers';
import { serializeCalendarPreviewEvents } from '@/lib/calendar/calendar-event-serialize';
import type { SerializedCalendarPreviewEvent } from '@/lib/calendar/calendar-event-types';
import { loadCalendarPreviewEvents } from '@/lib/calendar/display-events';
import {
  CALENDAR_LOCALE_COOKIE,
  CALENDAR_LOCALE_HEADER,
  CALENDAR_TIMEZONE_COOKIE,
  CALENDAR_TIMEZONE_HEADER,
  resolveCalendarLocale,
  resolveCalendarTimeZone,
} from '@/lib/calendar/timezone';

export type CalendarRequestContext = {
  locale: string;
  timeZone: string;
};

export const getCalendarRequestContext = async (): Promise<CalendarRequestContext> => {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const timeZone = resolveCalendarTimeZone(
    headerStore.get(CALENDAR_TIMEZONE_HEADER) ??
      cookieStore.get(CALENDAR_TIMEZONE_COOKIE)?.value,
  );
  const locale = resolveCalendarLocale(
    headerStore.get(CALENDAR_LOCALE_HEADER) ??
      cookieStore.get(CALENDAR_LOCALE_COOKIE)?.value,
  );

  return { timeZone, locale };
};

export const loadSerializedCalendarPreviewEvents = async (options?: {
  includeBirthdays?: boolean;
}): Promise<{
  events: SerializedCalendarPreviewEvent[];
  locale: string;
  timeZone: string;
}> => {
  const { locale, timeZone } = await getCalendarRequestContext();
  const rows = await loadCalendarPreviewEvents({
    includeBirthdays: options?.includeBirthdays,
    timeZone,
  });

  return {
    events: serializeCalendarPreviewEvents(rows, { timeZone }),
    locale,
    timeZone,
  };
};
