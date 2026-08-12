import type {
  CalendarPreviewEvent,
  SerializedCalendarPreviewEvent,
} from '@/lib/calendar/calendar-event-types';

import { formatDateKeyInTimeZone } from '@/lib/calendar/calendar-dates';

type SerializeCalendarPreviewEventsOptions = {
  timeZone: string;
};

export const serializeCalendarPreviewEvents = (
  rows: CalendarPreviewEvent[],
  options: SerializeCalendarPreviewEventsOptions,
): SerializedCalendarPreviewEvent[] =>
  rows.map(event => ({
    allDay: event.allDay,
    description: event.description ?? null,
    end: event.allDay
      ? (event.endDateKey
        ?? formatDateKeyInTimeZone(event.end, options.timeZone))
      : event.end.toISOString(),
    id: event.id,
    kind: event.kind,
    location: event.location ?? null,
    start: event.allDay
      ? (event.startDateKey
        ?? formatDateKeyInTimeZone(event.start, options.timeZone))
      : event.start.toISOString(),
    title: event.title,
    variant: event.variant,
  }));
