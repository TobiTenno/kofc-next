'use client';

import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  dateFnsLocalizer,
  type EventPropGetter,
  type ToolbarProps,
  type View,
  Views,
} from 'react-big-calendar';
import { CalendarEventDialog } from '@/components/calendar/CalendarEventDialog';
import type {
  CalendarEventVariant,
  CalendarPreviewEvent,
  SerializedCalendarPreviewEvent,
} from '@/lib/calendar/calendar-event-types';
import { deserializeCalendarPreviewEvents } from '@/lib/calendar/calendar-event-types';
import '@/components/calendar/shadcn-big-calendar.css';

type CalendarEvent = CalendarPreviewEvent;

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

const MOBILE_CALENDAR_MAX_WIDTH = 1023;

const isMobileCalendarViewport = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia(`(max-width: ${MOBILE_CALENDAR_MAX_WIDTH}px)`).matches;

const defaultCalendarView = (): View =>
  isMobileCalendarViewport() ? Views.AGENDA : Views.MONTH;

const viewLabels: Record<View, string> = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
  agenda: 'Agenda',
  work_week: 'Work week',
};

const CalendarToolbar = ({
  label,
  onNavigate,
  onView,
  view,
  views,
}: ToolbarProps<CalendarEvent>) => {
  const viewOptions = (views as View[]).filter((name) => name in viewLabels);

  return (
    <div className='mb-4 grid gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='button'
            className='rounded border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 text-sm font-medium hover:opacity-90'
            onClick={() => onNavigate('TODAY')}
          >
            Today
          </button>
          <button
            type='button'
            className='rounded border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--muted)]'
            onClick={() => onNavigate('PREV')}
          >
            Back
          </button>
          <button
            type='button'
            className='rounded border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--muted)]'
            onClick={() => onNavigate('NEXT')}
          >
            Next
          </button>
        </div>
        <p className='text-base font-semibold'>{label}</p>
        <div className='flex flex-wrap gap-1 rounded border border-[var(--border)] p-1'>
          {viewOptions.map((name) => (
            <button
              key={name}
              type='button'
              className={`rounded px-3 py-1 text-sm ${
                view === name
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'hover:bg-[var(--muted)]'
              }`}
              onClick={() => onView(name)}
            >
              {viewLabels[name]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const legendStyles: Record<CalendarEventVariant, string> = {
  primary: 'bg-[var(--primary)]',
  secondary: 'bg-[var(--secondary)] border border-[var(--border)]',
  outline: 'bg-[var(--muted)] border border-[var(--border)]',
};

const legendItems: Array<{ label: string; variant: CalendarEventVariant }> = [
  { label: 'Council meeting', variant: 'primary' },
  { label: 'Officers meeting', variant: 'outline' },
  { label: 'Council event', variant: 'primary' },
  { label: 'Member event', variant: 'secondary' },
  { label: 'Birthday', variant: 'outline' },
];

type CalendarPreviewProps = {
  events: SerializedCalendarPreviewEvent[];
  showBirthdayLegend?: boolean;
};

export const CalendarPreview = ({
  events,
  showBirthdayLegend = false,
}: CalendarPreviewProps) => {
  const [view, setView] = useState<View>(defaultCalendarView);
  const [calendarReady, setCalendarReady] = useState(false);
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  useEffect(() => {
    const media = window.matchMedia(
      `(max-width: ${MOBILE_CALENDAR_MAX_WIDTH}px)`,
    );
    const syncView = (): void => {
      setView(media.matches ? Views.AGENDA : Views.MONTH);
    };

    syncView();
    setCalendarReady(true);
    media.addEventListener('change', syncView);
    return () => media.removeEventListener('change', syncView);
  }, []);

  const calendarEvents = useMemo(
    () => deserializeCalendarPreviewEvents(events),
    [events],
  );

  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => ({
    className: `event-variant-${event.variant}`,
  });

  const visibleLegend = showBirthdayLegend
    ? legendItems
    : legendItems.filter((item) => item.label !== 'Birthday');

  const calendarMinHeight = view === Views.AGENDA ? '420px' : '560px';

  return (
    <div className='grid w-full gap-4'>
      <div className='flex flex-wrap gap-3 text-sm'>
        {visibleLegend.map((item) => (
          <span key={item.label} className='flex items-center gap-2'>
            <span
              className={`inline-block h-3 w-3 rounded-sm ${legendStyles[item.variant]}`}
              aria-hidden
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className='w-full min-h-[420px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 sm:min-h-[640px] sm:p-4'>
        {calendarReady ? (
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            popup
            showMultiDayTimes
            className='w-full'
            style={{ minHeight: calendarMinHeight, width: '100%' }}
            components={{ toolbar: CalendarToolbar }}
            eventPropGetter={eventPropGetter}
            onSelectEvent={(event) => setSelectedEvent(event)}
          />
        ) : (
          <div
            className='w-full rounded-md bg-[var(--muted)]/30'
            style={{ minHeight: calendarMinHeight }}
            aria-hidden
          />
        )}
      </div>
      {selectedEvent ? (
        <CalendarEventDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      ) : null}
    </div>
  );
};
