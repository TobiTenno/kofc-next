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

const CALENDAR_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export const getBrowserCalendarContext = (): BrowserCalendarContext => ({
  locale: navigator.language || 'en-US',
  timeZone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
});

export const calendarRequestHeaders = (
  context: BrowserCalendarContext = getBrowserCalendarContext(),
): Record<string, string> => ({
  [CALENDAR_LOCALE_HEADER]: context.locale,
  [CALENDAR_TIMEZONE_HEADER]: context.timeZone,
});

const writeCookie = async (name: string, value: string): Promise<void> => {
  if (typeof cookieStore === 'undefined') {
    return;
  }

  await cookieStore.set({
    expires: Date.now() + CALENDAR_COOKIE_MAX_AGE_MS,
    name,
    path: '/',
    sameSite: 'lax',
    value,
  });
};

/**
Persist browser TZ/locale so SSR can render calendar dates on the next request.
*/
export const syncCalendarContextCookies = async (
  context: BrowserCalendarContext = getBrowserCalendarContext(),
): Promise<void> => {
  await Promise.all([
    writeCookie(CALENDAR_TIMEZONE_COOKIE, context.timeZone),
    writeCookie(CALENDAR_LOCALE_COOKIE, context.locale),
  ]);
};
