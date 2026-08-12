'use client';

import { useEffect, useState } from 'react';

import type { SerializedCalendarPreviewEvent } from '@/lib/calendar/calendar-event-types';

import { CalendarPreview } from '@/components/calendar/CalendarPreview';
import { CalendarSubscribeLinks } from '@/components/calendar/CalendarSubscribeLinks';
import { authClient } from '@/lib/auth-client';
import {
  calendarRequestHeaders,
  syncCalendarContextCookies,
} from '@/lib/calendar/client-context';

type PreviewPayload = {
  baseUrl: string;
  birthdayUrl: null | string;
  events: SerializedCalendarPreviewEvent[];
  signedIn: boolean;
  timeZone?: string;
};

type PublicCalendarContentProps = {
  baseUrl: string;
  calendarBasePath: string;
  initialBirthdayUrl: null | string;
  initialEvents: SerializedCalendarPreviewEvent[];
  initialSignedIn: boolean;
  serverTimeZone?: string;
};

export const PublicCalendarContent = ({
  baseUrl,
  calendarBasePath,
  initialBirthdayUrl,
  initialEvents,
  initialSignedIn,
  serverTimeZone,
}: PublicCalendarContentProps) => {
  const { data: session, isPending } = authClient.useSession();
  const [events, setEvents] = useState(initialEvents);
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [birthdayUrl, setBirthdayUrl] = useState(initialBirthdayUrl);
  const [feedBaseUrl, setFeedBaseUrl] = useState(baseUrl);

  useEffect(() => {
    void syncCalendarContextCookies();
  }, []);

  useEffect(() => {
    if (isPending) {
      return;
    }

    const clientSignedIn = Boolean(session?.user);
    if (!clientSignedIn || initialSignedIn) {
      return;
    }

    const loadMemberCalendar = async (): Promise<void> => {
      const response = await fetch('/api/calendar/preview', {
        credentials: 'include',
        headers: calendarRequestHeaders(),
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as PreviewPayload;
      setEvents(payload.events);
      setSignedIn(payload.signedIn);
      setBirthdayUrl(payload.birthdayUrl);
      setFeedBaseUrl(payload.baseUrl);
    };

    void loadMemberCalendar();
  }, [session?.user, isPending, initialSignedIn]);

  return (
    <section className='flex w-full flex-col gap-6'>
      <div className='grid gap-2'>
        <h1 className='text-2xl font-bold'>Council Calendar</h1>
        <p className='text-sm opacity-80'>
          Preview council and member events
          {signedIn ? ', including member birthdays' : ''}
          . Subscribe via .ics
          links below.
        </p>
      </div>
      <CalendarPreview
        calendarBasePath={calendarBasePath}
        events={events}
        refreshEventsFrom='/api/calendar/preview'
        serverTimeZone={serverTimeZone}
        showBirthdayLegend={signedIn}
      />
      <CalendarSubscribeLinks baseUrl={feedBaseUrl} birthdayUrl={birthdayUrl} />
      {signedIn
        ? null
        : (
            <p className='text-sm'>
              Member birthdays are available after
              {' '}
              <a className='underline' href='/members/login'>
                login
              </a>
              .
            </p>
          )}
    </section>
  );
};
