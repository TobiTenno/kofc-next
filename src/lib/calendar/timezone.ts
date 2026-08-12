export const CALENDAR_TIMEZONE_HEADER = 'x-calendar-timezone';
export const CALENDAR_LOCALE_HEADER = 'x-calendar-locale';
export const CALENDAR_TIMEZONE_COOKIE = 'calendar-timezone';
export const CALENDAR_LOCALE_COOKIE = 'calendar-locale';
export const DEFAULT_CALENDAR_TIMEZONE = 'America/Chicago';

export const isValidIanaTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  }
  catch {
    return false;
  }
};

export const resolveCalendarTimeZone = (
  value: null | string | undefined,
): string =>
  value && isValidIanaTimeZone(value) ? value : DEFAULT_CALENDAR_TIMEZONE;

export const resolveCalendarLocale = (
  value: null | string | undefined,
): string => value?.trim() || 'en-US';

export const isCalendarDateKey = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);
