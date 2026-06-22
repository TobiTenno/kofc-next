'use client';

import { useEffect, useState } from 'react';
import { CalendarPreview } from '@/components/calendar/CalendarPreview';
import { CalendarSubscribeLinks } from '@/components/calendar/CalendarSubscribeLinks';
import { authClient } from '@/lib/auth-client';
import type { SerializedCalendarPreviewEvent } from '@/lib/calendar/calendar-event-types';

type PublicCalendarContentProps = {
  baseUrl: string;
  initialEvents: SerializedCalendarPreviewEvent[];
  initialSignedIn: boolean;
  initialBirthdayUrl: string | null;
};

type PreviewPayload = {
  signedIn: boolean;
  events: SerializedCalendarPreviewEvent[];
  birthdayUrl: string | null;
  baseUrl: string;
};

export const PublicCalendarContent = ({
  baseUrl,
  initialEvents,
  initialSignedIn,
  initialBirthdayUrl,
}: PublicCalendarContentProps) => {
  const { data: session, isPending } = authClient.useSession();
  const [events, setEvents] = useState(initialEvents);
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [birthdayUrl, setBirthdayUrl] = useState(initialBirthdayUrl);
  const [feedBaseUrl, setFeedBaseUrl] = useState(baseUrl);

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
          {signedIn ? ', including member birthdays' : ''}. Subscribe via .ics
          links below.
        </p>
      </div>
      <CalendarPreview events={events} showBirthdayLegend={signedIn} />
      <CalendarSubscribeLinks baseUrl={feedBaseUrl} birthdayUrl={birthdayUrl} />
      {signedIn ? null : (
        <p className='text-sm'>
          Member birthdays are available after{' '}
          <a className='underline' href='/members/login'>
            login
          </a>
          .
        </p>
      )}
    </section>
  );
};
