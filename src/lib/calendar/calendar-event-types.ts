import { parseCalendarDateLocal } from '@/lib/calendar/calendar-date-parse';

export type CalendarEventKind
  = | 'birthday'
    | 'council-event'
    | 'council-meeting'
    | 'member-event'
    | 'officers-meeting';

export type CalendarEventVariant = 'outline' | 'primary' | 'secondary';

export type CalendarPreviewEvent = {
  allDay?: boolean;
  description?: null | string;
  end: Date;
  /**
  YYYY-MM-DD exclusive end for all-day events.
  */
  endDateKey?: string;
  id: string;
  kind: CalendarEventKind;
  location?: null | string;
  start: Date;
  /**
  YYYY-MM-DD for all-day events (stable across server TZ).
  */
  startDateKey?: string;
  title: string;
  variant: CalendarEventVariant;
};

export type SerializedCalendarPreviewEvent = {
  allDay?: boolean;
  description?: null | string;
  end: string;
  id: string;
  kind: CalendarEventKind;
  location?: null | string;
  start: string;
  title: string;
  variant: CalendarEventVariant;
};

export const deserializeCalendarPreviewEvents = (
  rows: SerializedCalendarPreviewEvent[],
): CalendarPreviewEvent[] =>
  rows.map(event => ({
    allDay: event.allDay,
    description: event.description ?? null,
    end: event.allDay ? parseCalendarDateLocal(event.end) : new Date(event.end),
    id: event.id,
    kind: event.kind,
    location: event.location ?? null,
    start: event.allDay
      ? parseCalendarDateLocal(event.start)
      : new Date(event.start),
    title: event.title,
    variant: event.variant,
  }));

export const calendarEventKindLabel: Record<CalendarEventKind, string> = {
  'birthday': 'Birthday',
  'council-event': 'Council event',
  'council-meeting': 'Council meeting',
  'member-event': 'Member event',
  'officers-meeting': 'Officers meeting',
};
