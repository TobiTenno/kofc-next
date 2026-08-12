import type { View } from 'react-big-calendar';

export const CALENDAR_VIEW_SEGMENTS = [
  'month',
  'week',
  'day',
  'agenda',
] as const;

export type CalendarViewSegment = (typeof CALENDAR_VIEW_SEGMENTS)[number];

/**
Desktop / SSR fallback when viewport is unknown.
*/
export const DEFAULT_CALENDAR_VIEW_SEGMENT: CalendarViewSegment = 'month';

export const MOBILE_CALENDAR_MAX_WIDTH_PX = 1023;

export const isCalendarViewSegment = (
  value: string,
): value is CalendarViewSegment =>
  CALENDAR_VIEW_SEGMENTS.includes(value as CalendarViewSegment);

export const isMobileCalendarViewport = (): boolean =>
  typeof window !== 'undefined'
  && globalThis.matchMedia(`(max-width: ${MOBILE_CALENDAR_MAX_WIDTH_PX}px)`).matches;

/**
Client-only: agenda on mobile, month on desktop.
*/
export const defaultCalendarViewSegment = (): CalendarViewSegment =>
  isMobileCalendarViewport() ? 'agenda' : DEFAULT_CALENDAR_VIEW_SEGMENT;

export const parseCalendarViewFromPathname = (
  pathname: string,
  basePath: string,
): null | View => {
  if (!pathname.startsWith(basePath)) {
    return null;
  }

  const suffix = pathname.slice(basePath.length).replace(/^\//, '');
  if (!suffix) {
    return null;
  }

  const segment = suffix.split('/', 1)[0];
  return isCalendarViewSegment(segment) ? segment : null;
};

export const calendarPathWithView = (basePath: string, view: View): string =>
  `${basePath}/${view}`;
