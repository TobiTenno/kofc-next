import { and, eq } from 'drizzle-orm';
import ical from 'ical-generator';
import { db } from '@/db';
import { events, members } from '@/db/schema';
import { parseMemberBirthMonthDay } from '@/lib/calendar/birth-date';
import { loadCouncilConfig } from '@/lib/council-config';
import { formatMemberName } from '@/lib/utils';

const councilName = (): string => {
  const config = loadCouncilConfig();
  const number = config.council?.number;
  const name = config.council?.name;
  if (name && number) {
    return `Council ${number} ${name}`;
  }
  if (number) {
    return `Council ${number}`;
  }
  return 'Knights of Columbus Council';
};

const addMeetingEvents = (calendar: ReturnType<typeof ical>): void => {
  const config = loadCouncilConfig();
  const meeting = config.council?.meetingTimes?.council;
  if (!meeting) {
    return;
  }

  calendar.createEvent({
    id: 'council-meeting',
    summary: `${councilName()} Meeting`,
    description: `${meeting.frequency} on the ${meeting.day} at ${meeting.time}`,
    location: config.council?.meetingLocation
      ? `${config.council?.meetingLocation.street}, ${config.council?.meetingLocation.city}`
      : undefined,
    start: new Date(),
    repeating: 'FREQ=MONTHLY',
    timezone: 'America/Chicago',
  });
};

export const buildCouncilCalendar = async (): Promise<string> => {
  const calendar = ical({ name: `${councilName()} Events` });
  addMeetingEvents(calendar);

  const councilEvents = await db
    .select()
    .from(events)
    .where(eq(events.type, 'council'));

  for (const event of councilEvents) {
    calendar.createEvent({
      id: event.id,
      summary: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      start: event.startAt,
      end: event.endAt ?? undefined,
      allDay: event.allDay,
      repeating: event.recurrenceRule ?? undefined,
    });
  }

  return calendar.toString();
};

export const buildMemberEventsCalendar = async (): Promise<string> => {
  const calendar = ical({ name: `${councilName()} Member Events` });
  const memberEvents = await db
    .select()
    .from(events)
    .where(eq(events.type, 'member'));

  for (const event of memberEvents) {
    calendar.createEvent({
      id: event.id,
      summary: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      start: event.startAt,
      end: event.endAt ?? undefined,
      allDay: event.allDay,
      repeating: event.recurrenceRule ?? undefined,
    });
  }

  return calendar.toString();
};

export const buildBirthdaysCalendar = async (): Promise<string> => {
  const calendar = ical({
    name: `${councilName()} Birthdays`,
    timezone: 'America/Chicago',
  });

  const activeMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.active, true)));

  const year = new Date().getFullYear();

  for (const member of activeMembers) {
    if (!member.birthDate) {
      continue;
    }

    const parsed = parseMemberBirthMonthDay(member.birthDate);
    if (!parsed) {
      continue;
    }

    calendar.createEvent({
      id: `birthday-${member.membershipNumber}`,
      summary: `${formatMemberName(member)} Birthday`,
      start: new Date(year, parsed.month - 1, parsed.day),
      allDay: true,
      repeating: 'FREQ=YEARLY',
    });
  }

  return calendar.toString();
};
