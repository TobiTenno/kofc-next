import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { events, members } from '@/db/schema';
import { parseMemberBirthMonthDay } from '@/lib/calendar/birth-date';
import type {
  CalendarEventVariant,
  CalendarPreviewEvent,
} from '@/lib/calendar/calendar-event-types';
import { loadCouncilConfig } from '@/lib/council-config';
import { formatPostalAddress } from '@/lib/openstreetmap';
import { formatMemberName } from '@/lib/utils';

export type {
  CalendarEventVariant,
  CalendarPreviewEvent,
  SerializedCalendarPreviewEvent,
} from '@/lib/calendar/calendar-event-types';

export {
  deserializeCalendarPreviewEvents,
  serializeCalendarPreviewEvents,
} from '@/lib/calendar/calendar-event-types';

const weekdayIndex: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const previewRangeYears = (): { startYear: number; endYear: number } => {
  const year = new Date().getFullYear();
  return { startYear: year - 1, endYear: year + 1 };
};

const parseOrdinalWeekday = (
  value: string,
): { nth: number; weekday: number } | null => {
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
): { hours: number; minutes: number } | null => {
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
): Date | null => {
  const first = new Date(year, monthIndex, 1);
  let day = 1 + ((weekday - first.getDay() + 7) % 7);
  day += (nth - 1) * 7;

  const date = new Date(year, monthIndex, day);
  if (date.getMonth() !== monthIndex) {
    return null;
  }

  return date;
};

const formatMeetingLocation = (): string | null => {
  const location = loadCouncilConfig().council?.meetingLocation;
  if (!location) {
    return null;
  }

  return formatPostalAddress(location);
};

const expandMonthlyMeeting = (options: {
  id: string;
  title: string;
  day: string;
  time: string;
  variant: CalendarEventVariant;
  kind: CalendarPreviewEvent['kind'];
  location?: string | null;
}): CalendarPreviewEvent[] => {
  const schedule = parseOrdinalWeekday(options.day);
  const clock = parseMeetingTime(options.time);
  if (!schedule || !clock) {
    return [];
  }

  const { startYear, endYear } = previewRangeYears();
  const results: CalendarPreviewEvent[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      const day = nthWeekdayOfMonth(
        year,
        month,
        schedule.weekday,
        schedule.nth,
      );
      if (!day) {
        continue;
      }

      const start = new Date(day);
      start.setHours(clock.hours, clock.minutes, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 2);

      results.push({
        id: `${options.id}-${year}-${month + 1}`,
        title: options.title,
        start,
        end,
        variant: options.variant,
        kind: options.kind,
        location: options.location ?? null,
      });
    }
  }

  return results;
};

const councilMeetingEvents = (): CalendarPreviewEvent[] => {
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
        id: 'council-meeting',
        title: councilName,
        day: council.day,
        time: council.time,
        variant: 'primary',
        kind: 'council-meeting',
        location: meetingLocation,
      }),
    );
  }

  if (officers) {
    rows.push(
      ...expandMonthlyMeeting({
        id: 'officers-meeting',
        title: 'Officers Meeting',
        day: officers.day,
        time: officers.time,
        variant: 'outline',
        kind: 'officers-meeting',
        location: meetingLocation,
      }),
    );
  }

  return rows;
};

const dbEventEnd = (start: Date, end: Date | null, allDay: boolean): Date => {
  if (end) {
    return end;
  }

  if (allDay) {
    const dayEnd = new Date(start);
    dayEnd.setHours(23, 59, 59, 999);
    return dayEnd;
  }

  return new Date(start.getTime() + 60 * 60 * 1000);
};

const dbEvents = async (): Promise<CalendarPreviewEvent[]> => {
  const rows = await db.select().from(events).orderBy(events.startAt);

  return rows.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startAt,
    end: dbEventEnd(event.startAt, event.endAt, event.allDay),
    allDay: event.allDay,
    variant: event.type === 'council' ? 'primary' : 'secondary',
    kind: event.type === 'council' ? 'council-event' : 'member-event',
    description: event.description,
    location: event.location,
  }));
};

const birthdayEvents = async (): Promise<CalendarPreviewEvent[]> => {
  const activeMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.active, true)));

  const { startYear, endYear } = previewRangeYears();
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
      const start = new Date(year, parsed.month - 1, parsed.day);
      const end = new Date(year, parsed.month - 1, parsed.day, 23, 59, 59, 999);

      results.push({
        id: `birthday-${member.membershipNumber}-${year}`,
        title: `${formatMemberName(member)} Birthday`,
        start,
        end,
        allDay: true,
        variant: 'outline',
        kind: 'birthday',
      });
    }
  }

  return results;
};

export const loadCalendarPreviewEvents = async (options?: {
  includeBirthdays?: boolean;
}): Promise<CalendarPreviewEvent[]> => {
  const [meetings, storedEvents, birthdays] = await Promise.all([
    Promise.resolve(councilMeetingEvents()),
    dbEvents(),
    options?.includeBirthdays ? birthdayEvents() : Promise.resolve([]),
  ]);

  return [...meetings, ...storedEvents, ...birthdays].sort(
    (left, right) => left.start.getTime() - right.start.getTime(),
  );
};
