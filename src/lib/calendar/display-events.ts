import { and, eq } from 'drizzle-orm';

import type {
  CalendarEventVariant,
  CalendarPreviewEvent,
} from '@/lib/calendar/calendar-event-types';

import { db } from '@/db';
import { events, members } from '@/db/schema';
import { parseMemberBirthMonthDay } from '@/lib/calendar/birth-date';
import { parseCalendarDateLocal } from '@/lib/calendar/calendar-date-parse';
import {
  addDaysToDateKey,
  formatDateKey,
  formatDateKeyInTimeZone,
  zonedWallTimeToDate,
} from '@/lib/calendar/calendar-dates';
import { DEFAULT_CALENDAR_TIMEZONE } from '@/lib/calendar/timezone';
import { loadCouncilConfig } from '@/lib/council-config';
import { formatPostalAddress } from '@/lib/openstreetmap';
import { formatMemberName } from '@/lib/utils';

export { serializeCalendarPreviewEvents } from '@/lib/calendar/calendar-event-serialize';
export type {
  CalendarEventVariant,
  CalendarPreviewEvent,
  SerializedCalendarPreviewEvent,
} from '@/lib/calendar/calendar-event-types';
export { deserializeCalendarPreviewEvents } from '@/lib/calendar/calendar-event-types';

const weekdayIndex: Record<string, number> = {
  friday: 5,
  monday: 1,
  saturday: 6,
  sunday: 0,
  thursday: 4,
  tuesday: 2,
  wednesday: 3,
};

const previewRangeYears = (
  timeZone: string,
): { endYear: number; startYear: number } => {
  const year = Number(
    formatDateKeyInTimeZone(new Date(), timeZone).slice(0, 4),
  );
  return { endYear: year + 1, startYear: year - 1 };
};

const parseOrdinalWeekday = (
  value: string,
): null | { nth: number; weekday: number } => {
  const match = value.trim().match(/^(\d+)(?:st|nd|rd|th)\s+(\w+)$/i);
  if (!match) {
    return null;
  }

  const nth = Number(match[1]);
  const weekday = weekdayIndex[match[2].toLowerCase()];
  if (!weekday || nth < 1 || nth > 5) {
    return null;
  }

  return { nth, weekday };
};

const parseMeetingTime = (
  value: string,
): null | { hours: number; minutes: number } => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }
  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
};

const nthWeekdayOfMonth = (
  year: number,
  monthIndex: number,
  weekday: number,
  nth: number,
): null | { day: number; month: number; year: number } => {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  let day = 1 + ((weekday - first.getUTCDay() + 7) % 7);
  day += (nth - 1) * 7;

  const date = new Date(Date.UTC(year, monthIndex, day));
  if (date.getUTCMonth() !== monthIndex) {
    return null;
  }

  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
};

const formatMeetingLocation = (): null | string => {
  const location = loadCouncilConfig().council?.meetingLocation;
  if (!location) {
    return null;
  }

  return formatPostalAddress(location);
};

const expandMonthlyMeeting = (options: {
  councilTimeZone: string;
  day: string;
  id: string;
  kind: CalendarPreviewEvent['kind'];
  location?: null | string;
  time: string;
  timeZone: string;
  title: string;
  variant: CalendarEventVariant;
}): CalendarPreviewEvent[] => {
  const schedule = parseOrdinalWeekday(options.day);
  const clock = parseMeetingTime(options.time);
  if (!schedule || !clock) {
    return [];
  }

  const { endYear, startYear } = previewRangeYears(options.timeZone);
  const results: CalendarPreviewEvent[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      const meetingDay = nthWeekdayOfMonth(
        year,
        month,
        schedule.weekday,
        schedule.nth,
      );
      if (!meetingDay) {
        continue;
      }

      const start = zonedWallTimeToDate(
        options.councilTimeZone,
        meetingDay.year,
        meetingDay.month,
        meetingDay.day,
        clock.hours,
        clock.minutes,
      );
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

      results.push({
        end,
        id: `${options.id}-${year}-${month + 1}`,
        kind: options.kind,
        location: options.location ?? null,
        start,
        title: options.title,
        variant: options.variant,
      });
    }
  }

  return results;
};

const councilMeetingEvents = (
  councilTimeZone: string,
  timeZone: string,
): CalendarPreviewEvent[] => {
  const config = loadCouncilConfig();
  const council = config.council?.meetingTimes?.council;
  const officers = config.council?.meetingTimes?.officers;
  const councilName = config.council?.number
    ? `Council ${config.council.number} Meeting`
    : 'Council Meeting';
  const meetingLocation = formatMeetingLocation();

  const rows: CalendarPreviewEvent[] = [];

  if (council) {
    rows.push(
      ...expandMonthlyMeeting({
        councilTimeZone,
        day: council.day,
        id: 'council-meeting',
        kind: 'council-meeting',
        location: meetingLocation,
        time: council.time,
        timeZone,
        title: councilName,
        variant: 'primary',
      }),
    );
  }

  if (officers) {
    rows.push(
      ...expandMonthlyMeeting({
        councilTimeZone,
        day: officers.day,
        id: 'officers-meeting',
        kind: 'officers-meeting',
        location: meetingLocation,
        time: officers.time,
        timeZone,
        title: 'Officers Meeting',
        variant: 'outline',
      }),
    );
  }

  return rows;
};

const dbEventEnd = (
  start: Date,
  end: Date | null,
  allDay: boolean,
  timeZone: string,
): Date => {
  if (end) {
    return end;
  }

  if (allDay) {
    const startKey = formatDateKeyInTimeZone(start, timeZone);
    const endKey = addDaysToDateKey(startKey, 1);
    return parseCalendarDateLocal(endKey);
  }

  return new Date(start.getTime() + 60 * 60 * 1000);
};

const dbEvents = async (timeZone: string): Promise<CalendarPreviewEvent[]> => {
  const rows = await db.select().from(events).orderBy(events.startAt);

  return rows.map((event) => {
    const allDay = event.allDay;
    const start = event.startAt;
    const end = dbEventEnd(event.startAt, event.endAt, allDay, timeZone);

    return {
      allDay,
      description: event.description,
      end,
      endDateKey: allDay ? formatDateKeyInTimeZone(end, timeZone) : undefined,
      id: event.id,
      kind: event.type === 'council' ? 'council-event' : 'member-event',
      location: event.location,
      start,
      startDateKey: allDay
        ? formatDateKeyInTimeZone(start, timeZone)
        : undefined,
      title: event.title,
      variant: event.type === 'council' ? 'primary' : 'secondary',
    } satisfies CalendarPreviewEvent;
  });
};

const birthdayEvents = async (
  timeZone: string,
): Promise<CalendarPreviewEvent[]> => {
  const activeMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.active, true)));

  const { endYear, startYear } = previewRangeYears(timeZone);
  const results: CalendarPreviewEvent[] = [];

  for (const member of activeMembers) {
    if (!member.birthDate) {
      continue;
    }

    const parsed = parseMemberBirthMonthDay(member.birthDate);
    if (!parsed) {
      continue;
    }

    for (let year = startYear; year <= endYear; year += 1) {
      const startDateKey = formatDateKey(year, parsed.month, parsed.day);
      const endDateKey = addDaysToDateKey(startDateKey, 1);

      results.push({
        allDay: true,
        end: parseCalendarDateLocal(endDateKey),
        endDateKey,
        id: `birthday-${member.membershipNumber}-${year}`,
        kind: 'birthday',
        start: parseCalendarDateLocal(startDateKey),
        startDateKey,
        title: `${formatMemberName(member)} Birthday`,
        variant: 'outline',
      });
    }
  }

  return results;
};

export const loadCalendarPreviewEvents = async (options?: {
  councilTimeZone?: string;
  includeBirthdays?: boolean;
  timeZone?: string;
}): Promise<CalendarPreviewEvent[]> => {
  const timeZone = options?.timeZone ?? DEFAULT_CALENDAR_TIMEZONE;
  const councilTimeZone = options?.councilTimeZone ?? DEFAULT_CALENDAR_TIMEZONE;

  const [meetings, storedEvents, birthdays] = await Promise.all([
    Promise.resolve(councilMeetingEvents(councilTimeZone, timeZone)),
    dbEvents(timeZone),
    options?.includeBirthdays ? birthdayEvents(timeZone) : Promise.resolve([]),
  ]);

  return [...meetings, ...storedEvents, ...birthdays].sort(
    (left, right) => left.start.getTime() - right.start.getTime(),
  );
};
