'use client';

import { Chip, Description, Header, Label, ListBox } from '@heroui/react';
import type { SyntheticEvent } from 'react';
import { useMemo } from 'react';
import {
  Navigate,
  type NavigateAction,
  type TitleOptions,
  type ViewProps,
  type ViewStatic,
} from 'react-big-calendar';
import type {
  CalendarEventVariant,
  CalendarPreviewEvent,
} from '@/lib/calendar/calendar-event-types';
import { calendarEventKindLabel } from '@/lib/calendar/calendar-event-types';

const DEFAULT_LENGTH = 30;

type AgendaCardViewProps = ViewProps<CalendarPreviewEvent>;

type AgendaDayGroup = {
  day: Date;
  label: string;
  events: CalendarPreviewEvent[];
};

const variantAccent: Record<CalendarEventVariant, string> = {
  primary: 'calendar-agenda-item--primary',
  secondary: 'calendar-agenda-item--secondary',
  outline: 'calendar-agenda-item--outline',
};

const eventInRange = (
  event: CalendarPreviewEvent,
  rangeStart: Date,
  rangeEnd: Date,
  accessors: AgendaCardViewProps['accessors'],
  localizer: AgendaCardViewProps['localizer'],
): boolean =>
  localizer.inEventRange({
    event: {
      start: accessors.start(event),
      end: accessors.end(event),
    },
    range: { start: rangeStart, end: rangeEnd },
  });

const formatAgendaTime = (
  day: Date,
  event: CalendarPreviewEvent,
  accessors: AgendaCardViewProps['accessors'],
  localizer: AgendaCardViewProps['localizer'],
): string => {
  const end = accessors.end(event);
  const start = accessors.start(event);

  if (accessors.allDay(event)) {
    return localizer.messages.allDay;
  }

  if (localizer.eq(start, end)) {
    return localizer.format(start, 'agendaTimeFormat');
  }

  if (localizer.isSameDate(start, end)) {
    return localizer.format({ start, end }, 'agendaTimeRangeFormat');
  }

  if (localizer.isSameDate(day, start)) {
    return localizer.format(start, 'agendaTimeFormat');
  }

  if (localizer.isSameDate(day, end)) {
    return localizer.format(end, 'agendaTimeFormat');
  }

  return localizer.format(start, 'agendaTimeFormat');
};

const AgendaCardView = ({
  accessors,
  date,
  events = [],
  length = DEFAULT_LENGTH,
  localizer,
  onSelectEvent,
}: AgendaCardViewProps) => {
  const messages = localizer.messages;
  const end = localizer.add(date, length, 'day');

  const dayGroups = useMemo((): AgendaDayGroup[] => {
    const range = localizer.range(date, end, 'day') as Date[];
    const filtered = [...events]
      .filter((event) =>
        eventInRange(
          event,
          localizer.startOf(date, 'day'),
          localizer.endOf(end, 'day'),
          accessors,
          localizer,
        ),
      )
      .sort((left, right) => +accessors.start(left) - +accessors.start(right));

    return range
      .map((day) => ({
        day,
        label: localizer.format(day, 'agendaDateFormat') as string,
        events: filtered.filter((event) =>
          eventInRange(
            event,
            localizer.startOf(day, 'day'),
            localizer.endOf(day, 'day'),
            accessors,
            localizer,
          ),
        ),
      }))
      .filter((group) => group.events.length > 0);
  }, [accessors, date, end, events, localizer]);

  if (dayGroups.length === 0) {
    return (
      <div className='calendar-agenda-list flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground'>
        {messages.noEventsInRange}
      </div>
    );
  }

  return (
    <ListBox
      aria-label='Calendar events'
      selectionMode='none'
      className='calendar-agenda-list'
    >
      {dayGroups.map((group) => (
        <ListBox.Section key={group.day.toISOString()}>
          <Header className='text-sm font-semibold text-foreground'>
            {group.label}
          </Header>
          {group.events.map((event) => {
            const itemId = `${group.day.toISOString()}-${event.id}`;

            return (
              <ListBox.Item
                key={itemId}
                id={itemId}
                textValue={event.title}
                className={`calendar-agenda-item items-start py-2 ${variantAccent[event.variant]}`}
                onAction={() =>
                  onSelectEvent?.(event, {} as SyntheticEvent<HTMLElement>)
                }
              >
                <div className='grid min-w-0 flex-1 gap-1'>
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <Label className='text-base font-semibold'>
                      {event.title}
                    </Label>
                    <Chip size='sm' variant='soft' color='default'>
                      <Chip.Label>
                        {calendarEventKindLabel[event.kind]}
                      </Chip.Label>
                    </Chip>
                  </div>
                  <Description className='text-[inherit] opacity-90'>
                    {formatAgendaTime(group.day, event, accessors, localizer)}
                  </Description>
                  {event.location ? (
                    <Description>{event.location}</Description>
                  ) : null}
                </div>
              </ListBox.Item>
            );
          })}
        </ListBox.Section>
      ))}
    </ListBox>
  );
};

AgendaCardView.range = (
  start: Date,
  { length = DEFAULT_LENGTH, localizer }: TitleOptions,
) => {
  const rangeEnd = localizer.add(start, length, 'day');
  return { start, end: rangeEnd };
};

AgendaCardView.navigate = (
  currentDate: Date,
  action: NavigateAction,
  { length = DEFAULT_LENGTH, localizer }: TitleOptions,
) => {
  switch (action) {
    case Navigate.PREVIOUS:
      return localizer.add(currentDate, -length, 'day');
    case Navigate.NEXT:
      return localizer.add(currentDate, length, 'day');
    default:
      return currentDate;
  }
};

AgendaCardView.title = (
  start: Date,
  { length = DEFAULT_LENGTH, localizer }: TitleOptions,
) => {
  const rangeEnd = localizer.add(start, length, 'day');
  return localizer.format(
    { start, end: rangeEnd },
    'agendaHeaderFormat',
  ) as string;
};

export const AgendaCardViewComponent = AgendaCardView as typeof AgendaCardView &
  ViewStatic;
