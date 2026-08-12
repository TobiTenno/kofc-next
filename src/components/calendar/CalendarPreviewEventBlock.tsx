'use client';

import type { EventProps } from 'react-big-calendar';

import type { CalendarPreviewEvent } from '@/lib/calendar/calendar-event-types';

export const CalendarPreviewEventBlock = ({
  title,
}: EventProps<CalendarPreviewEvent>) => (
  <span className='calendar-event-block__title'>{title}</span>
);
