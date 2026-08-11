'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { defaultCalendarViewSegment } from '@/lib/calendar/calendar-view-path';

type CalendarDefaultRedirectProps = {
  basePath: string;
};

export const CalendarDefaultRedirect = ({
  basePath,
}: CalendarDefaultRedirectProps) => {
  const router = useRouter();

  useEffect(() => {
    router.replace(`${basePath}/${defaultCalendarViewSegment()}`);
  }, [basePath, router]);

  return (
    <div
      className='w-full rounded-md bg-muted/30'
      style={{ minHeight: '420px' }}
      aria-hidden
    />
  );
};
