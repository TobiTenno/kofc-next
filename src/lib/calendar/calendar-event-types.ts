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

export const serializeCalendarPreviewEvents = (
  rows: CalendarPreviewEvent[],
): SerializedCalendarPreviewEvent[] =>
  rows.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    allDay: event.allDay,
    variant: event.variant,
    kind: event.kind,
    description: event.description ?? null,
    location: event.location ?? null,
  }));

export const deserializeCalendarPreviewEvents = (
  rows: SerializedCalendarPreviewEvent[],
): CalendarPreviewEvent[] =>
  rows.map((event) => ({
    id: event.id,
    title: event.title,
    start: new Date(event.start),
    end: new Date(event.end),
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
