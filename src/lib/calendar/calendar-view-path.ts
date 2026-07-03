import type { View } from 'react-big-calendar';

export const CALENDAR_VIEW_SEGMENTS = [
  'month',
  'week',
  'day',
  'agenda',
] as const;

export type CalendarViewSegment = (typeof CALENDAR_VIEW_SEGMENTS)[number];

export const DEFAULT_CALENDAR_VIEW_SEGMENT: CalendarViewSegment = 'month';

export const isCalendarViewSegment = (
  value: string,
): value is CalendarViewSegment =>
  CALENDAR_VIEW_SEGMENTS.includes(value as CalendarViewSegment);

export const parseCalendarViewFromPathname = (
  pathname: string,
  basePath: string,
): View | null => {
  if (!pathname.startsWith(basePath)) {
    return null;
  }

  const suffix = pathname.slice(basePath.length).replace(/^\//, '');
  if (!suffix) {
    return null;
  }

  const segment = suffix.split('/')[0];
  return isCalendarViewSegment(segment) ? segment : null;
};

export const calendarPathWithView = (
  basePath: string,
  view: View,
): string => `${basePath}/${view}`;
