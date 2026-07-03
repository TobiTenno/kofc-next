import { formatDateKeyInTimeZone } from '@/lib/calendar/calendar-dates';
import type {
  CalendarPreviewEvent,
  SerializedCalendarPreviewEvent,
} from '@/lib/calendar/calendar-event-types';

type SerializeCalendarPreviewEventsOptions = {
  timeZone: string;
};

export const serializeCalendarPreviewEvents = (
  rows: CalendarPreviewEvent[],
  options: SerializeCalendarPreviewEventsOptions,
): SerializedCalendarPreviewEvent[] =>
  rows.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.allDay
      ? (event.startDateKey ??
        formatDateKeyInTimeZone(event.start, options.timeZone))
      : event.start.toISOString(),
    end: event.allDay
      ? (event.endDateKey ??
        formatDateKeyInTimeZone(event.end, options.timeZone))
      : event.end.toISOString(),
    allDay: event.allDay,
    variant: event.variant,
    kind: event.kind,
    description: event.description ?? null,
    location: event.location ?? null,
  }));
