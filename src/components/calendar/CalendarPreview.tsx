'use client';

import {
  Button,
  ButtonGroup,
  Card,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  dayjsLocalizer,
  type EventPropGetter,
  type ToolbarProps,
  type View,
  Views,
} from 'react-big-calendar';

import type {
  CalendarEventVariant,
  CalendarPreviewEvent,
  SerializedCalendarPreviewEvent,
} from '@/lib/calendar/calendar-event-types';

import { AgendaCardViewComponent } from '@/components/calendar/AgendaCardView';
import { CalendarEventDialog } from '@/components/calendar/CalendarEventDialog';
import { CalendarPreviewEventBlock } from '@/components/calendar/CalendarPreviewEventBlock';
import { deserializeCalendarPreviewEvents } from '@/lib/calendar/calendar-event-types';
import {
  calendarPathWithView,
  defaultCalendarViewSegment,
  MOBILE_CALENDAR_MAX_WIDTH_PX,
  parseCalendarViewFromPathname,
} from '@/lib/calendar/calendar-view-path';
import {
  calendarRequestHeaders,
  getBrowserCalendarContext,
  syncCalendarContextCookies,
} from '@/lib/calendar/client-context';
import dayjs from '@/lib/calendar/dayjs';
import '@/components/calendar/shadcn-big-calendar.css';

type CalendarEvent = CalendarPreviewEvent;

const localizer = dayjsLocalizer(dayjs);

const viewLabels: Record<View, string> = {
  agenda: 'Agenda',
  day: 'Day',
  month: 'Month',
  week: 'Week',
  work_week: 'Work week',
};

const CalendarToolbar = ({
  label,
  onNavigate,
  onView,
  view,
  views,
}: ToolbarProps<CalendarEvent>) => {
  const viewOptions = (views as View[]).filter(name => name in viewLabels);

  return (
    <div className='calendar-toolbar mb-4 grid gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <ButtonGroup size='sm' variant='secondary'>
          <Button onPress={() => onNavigate('TODAY')}>Today</Button>
          <Button onPress={() => onNavigate('PREV')}>
            <ButtonGroup.Separator />
            Back
          </Button>
          <Button onPress={() => onNavigate('NEXT')}>
            <ButtonGroup.Separator />
            Next
          </Button>
        </ButtonGroup>

        <p className='text-base font-semibold text-foreground'>{label}</p>

        <ToggleButtonGroup
          onSelectionChange={(keys) => {
            if (keys === 'all') return;
            const next = [...keys][0] as undefined | View;
            if (next) onView(next);
          }}
          selectedKeys={new Set([view])}
          selectionMode='single'
          size='sm'
        >
          {viewOptions.map((name, index) => (
            <ToggleButton id={name} key={name}>
              {index > 0 ? <ToggleButtonGroup.Separator /> : null}
              {viewLabels[name]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>
    </div>
  );
};

const legendSwatchClass: Record<CalendarEventVariant, string> = {
  outline: 'calendar-legend-swatch--outline',
  primary: 'calendar-legend-swatch--primary',
  secondary: 'calendar-legend-swatch--secondary',
};

const legendItems: Array<{ label: string; variant: CalendarEventVariant }> = [
  { label: 'Council meeting', variant: 'primary' },
  { label: 'Officers meeting', variant: 'outline' },
  { label: 'Council event', variant: 'primary' },
  { label: 'Member event', variant: 'secondary' },
  { label: 'Birthday', variant: 'outline' },
];

type CalendarPreviewProps = {
  calendarBasePath: string;
  events: SerializedCalendarPreviewEvent[];
  refreshEventsFrom?: string;
  serverTimeZone?: string;
  showBirthdayLegend?: boolean;
};

export const CalendarPreview = ({
  calendarBasePath,
  events: initialEvents,
  refreshEventsFrom,
  serverTimeZone,
  showBirthdayLegend = false,
}: CalendarPreviewProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const persistView = useCallback(
    (nextView: View): void => {
      router.replace(calendarPathWithView(calendarBasePath, nextView), {
        scroll: false,
      });
    },
    [calendarBasePath, router],
  );

  const [view, setView] = useState<View>(Views.MONTH);
  const [calendarReady, setCalendarReady] = useState(false);
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const syncCalendar = async (): Promise<void> => {
      const browserContext = getBrowserCalendarContext();
      await syncCalendarContextCookies(browserContext);

      if (!refreshEventsFrom) {
        return;
      }

      if (serverTimeZone && browserContext.timeZone === serverTimeZone) {
        return;
      }

      const response = await fetch(refreshEventsFrom, {
        credentials: 'include',
        headers: calendarRequestHeaders(browserContext),
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        events: SerializedCalendarPreviewEvent[];
      };
      setEvents(payload.events);
    };

    void syncCalendar();
  }, [refreshEventsFrom, serverTimeZone]);

  useEffect(() => {
    const pathView = parseCalendarViewFromPathname(pathname, calendarBasePath);

    if (pathView) {
      setView(pathView);
    }
    else {
      const defaultView = defaultCalendarViewSegment();
      setView(defaultView);
      persistView(defaultView);
    }

    setCalendarReady(true);
  }, [calendarBasePath, pathname, persistView]);

  useEffect(() => {
    if (!calendarReady) {
      return;
    }

    if (parseCalendarViewFromPathname(pathname, calendarBasePath)) {
      return;
    }

    const media = globalThis.matchMedia(
      `(max-width: ${MOBILE_CALENDAR_MAX_WIDTH_PX}px)`,
    );
    const syncView = (): void => {
      setView(media.matches ? Views.AGENDA : Views.MONTH);
    };

    media.addEventListener('change', syncView);
    return () => media.removeEventListener('change', syncView);
  }, [calendarBasePath, calendarReady, pathname]);

  const handleViewChange = (nextView: View): void => {
    setView(nextView);
    persistView(nextView);
  };

  const calendarEvents = useMemo(
    () => deserializeCalendarPreviewEvents(events),
    [events],
  );

  const eventPropGetter: EventPropGetter<CalendarEvent> = event => ({
    className: `event-variant-${event.variant}`,
  });

  const visibleLegend = showBirthdayLegend
    ? legendItems
    : legendItems.filter(item => item.label !== 'Birthday');

  const calendarMinHeight = view === Views.AGENDA ? 'auto' : '560px';

  return (
    <div className='grid w-full gap-4'>
      <div className='flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground'>
        {visibleLegend.map(item => (
          <span className='flex items-center gap-2' key={item.label}>
            <span
              aria-hidden
              className={`calendar-legend-swatch ${legendSwatchClass[item.variant]}`}
            />
            {item.label}
          </span>
        ))}
      </div>

      <Card>
        <Card.Content className='calendar-shell pt-4'>
          {calendarReady
            ? (
                <Calendar
                  className='w-full'
                  components={{
                    event: CalendarPreviewEventBlock,
                    toolbar: CalendarToolbar,
                  }}
                  date={date}
                  eventPropGetter={eventPropGetter}
                  events={calendarEvents}
                  localizer={localizer}
                  onNavigate={setDate}
                  onSelectEvent={event => setSelectedEvent(event)}
                  onView={handleViewChange}
                  popup
                  showMultiDayTimes
                  style={{ minHeight: calendarMinHeight, width: '100%' }}
                  view={view}
                  views={{
                    agenda: AgendaCardViewComponent,
                    day: true,
                    month: true,
                    week: true,
                  }}
                />
              )
            : (
                <div
                  aria-hidden
                  className='w-full rounded-md bg-muted/30'
                  style={{
                    minHeight:
                  calendarMinHeight === 'auto' ? '420px' : calendarMinHeight,
                  }}
                />
              )}
        </Card.Content>
      </Card>

      {selectedEvent
        ? (
            <CalendarEventDialog
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )
        : null}
    </div>
  );
};
