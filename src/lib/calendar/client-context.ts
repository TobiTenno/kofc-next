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
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale: navigator.language || 'en-US',
});

export const calendarRequestHeaders = (
  context: BrowserCalendarContext = getBrowserCalendarContext(),
): Record<string, string> => ({
  [CALENDAR_TIMEZONE_HEADER]: context.timeZone,
  [CALENDAR_LOCALE_HEADER]: context.locale,
});

const writeCookie = async (name: string, value: string): Promise<void> => {
  if (typeof cookieStore === 'undefined') {
    return;
  }

  await cookieStore.set({
    name,
    value,
    path: '/',
    expires: Date.now() + CALENDAR_COOKIE_MAX_AGE_MS,
    sameSite: 'lax',
  });
};

/** Persist browser TZ/locale so SSR can render calendar dates on the next request. */
export const syncCalendarContextCookies = async (
  context: BrowserCalendarContext = getBrowserCalendarContext(),
): Promise<void> => {
  await Promise.all([
    writeCookie(CALENDAR_TIMEZONE_COOKIE, context.timeZone),
    writeCookie(CALENDAR_LOCALE_COOKIE, context.locale),
  ]);
};
