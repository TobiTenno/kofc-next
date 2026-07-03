import { parseCalendarDateLocal } from '@/lib/calendar/calendar-date-parse';

export type CalendarEventVariant = 'primary' | 'secondary' | 'outline';

export type CalendarEventKind =
  | 'council-meeting'
  | 'officers-meeting'
  | 'council-event'
  | 'member-event'
  | 'birthday';

export type CalendarPreviewEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  /** YYYY-MM-DD for all-day events (stable across server TZ). */
  startDateKey?: string;
  /** YYYY-MM-DD exclusive end for all-day events. */
  endDateKey?: string;
  variant: CalendarEventVariant;
  kind: CalendarEventKind;
  description?: string | null;
  location?: string | null;
};

export type SerializedCalendarPreviewEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  variant: CalendarEventVariant;
  kind: CalendarEventKind;
  description?: string | null;
  location?: string | null;
};

export const deserializeCalendarPreviewEvents = (
  rows: SerializedCalendarPreviewEvent[],
): CalendarPreviewEvent[] =>
  rows.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.allDay
      ? parseCalendarDateLocal(event.start)
      : new Date(event.start),
    end: event.allDay ? parseCalendarDateLocal(event.end) : new Date(event.end),
    allDay: event.allDay,
    variant: event.variant,
    kind: event.kind,
    description: event.description ?? null,
    location: event.location ?? null,
  }));

export const calendarEventKindLabel: Record<CalendarEventKind, string> = {
  'council-meeting': 'Council meeting',
  'officers-meeting': 'Officers meeting',
  'council-event': 'Council event',
  'member-event': 'Member event',
  birthday: 'Birthday',
};
