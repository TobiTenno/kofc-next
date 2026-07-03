import dayjs from '@/lib/calendar/dayjs';

export const formatDateKey = (
  year: number,
  month: number,
  day: number,
): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const addDaysToDateKey = (dateKey: string, days: number): string =>
  dayjs(`${dateKey}T12:00:00Z`).add(days, 'day').format('YYYY-MM-DD');

export const formatDateKeyInTimeZone = (date: Date, timeZone: string): string =>
  dayjs(date).tz(timeZone).format('YYYY-MM-DD');

export const zonedWallTimeToDate = (
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date =>
  dayjs
    .tz(
      `${formatDateKey(year, month, day)} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      timeZone,
    )
    .toDate();
