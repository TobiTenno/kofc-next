import {
  CALENDAR_LOCALE_COOKIE,
  CALENDAR_LOCALE_HEADER,
  CALENDAR_TIMEZONE_COOKIE,
  CALENDAR_TIMEZONE_HEADER,
} from '@/lib/calendar/timezone';

export type BrowserCalendarContext = {
  locale: string;
  timeZone: string;
};

export const getBrowserCalendarContext = (): BrowserCalendarContext => ({
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale: navigator.language || 'en-US',
});

export const calendarRequestHeaders = (
  context: BrowserCalendarContext = getBrowserCalendarContext(),
): Record<string, string> => ({
  [CALENDAR_TIMEZONE_HEADER]: context.timeZone,
  [CALENDAR_LOCALE_HEADER]: context.locale,
});

const writeCookie = (name: string, value: string): void => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
};

/** Persist browser TZ/locale so SSR can render calendar dates on the next request. */
export const syncCalendarContextCookies = (
  context: BrowserCalendarContext = getBrowserCalendarContext(),
): void => {
  writeCookie(CALENDAR_TIMEZONE_COOKIE, context.timeZone);
  writeCookie(CALENDAR_LOCALE_COOKIE, context.locale);
};
