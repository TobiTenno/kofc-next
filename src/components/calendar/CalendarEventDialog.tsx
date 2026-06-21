'use client';

import { format } from 'date-fns';
import { useEffect } from 'react';
import type { CalendarPreviewEvent } from '@/lib/calendar/calendar-event-types';
import { calendarEventKindLabel } from '@/lib/calendar/calendar-event-types';
import { buildOsmSearchUrl } from '@/lib/openstreetmap';

type CalendarEventDialogProps = {
  event: CalendarPreviewEvent;
  onClose: () => void;
};

const formatEventWhen = (event: CalendarPreviewEvent): string => {
  if (event.allDay) {
    if (event.start.toDateString() === event.end.toDateString()) {
      return format(event.start, 'EEEE, MMMM d, yyyy');
    }

    return `${format(event.start, 'MMM d, yyyy')} – ${format(event.end, 'MMM d, yyyy')}`;
  }

  const sameDay = event.start.toDateString() === event.end.toDateString();
  if (sameDay) {
    return `${format(event.start, 'EEEE, MMMM d, yyyy')} · ${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}`;
  }

  return `${format(event.start, 'MMM d, yyyy h:mm a')} – ${format(event.end, 'MMM d, yyyy h:mm a')}`;
};

export const CalendarEventDialog = ({
  event,
  onClose,
}: CalendarEventDialogProps) => {
  useEffect(() => {
    const onKeyDown = (keyboardEvent: KeyboardEvent): void => {
      if (keyboardEvent.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <button
        type='button'
        aria-label='Close dialog'
        className='absolute inset-0 bg-black/50'
        onClick={onClose}
      />
      <div
        className='relative z-10 w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg'
        role='dialog'
        aria-modal='true'
        aria-labelledby='calendar-event-title'
      >
        <div className='mb-4 flex items-start justify-between gap-4'>
          <div className='grid gap-1'>
            <p className='text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]'>
              {calendarEventKindLabel[event.kind]}
            </p>
            <h2 id='calendar-event-title' className='text-xl font-semibold'>
              {event.title}
            </h2>
          </div>
          <button
            type='button'
            className='rounded border border-[var(--border)] px-2 py-1 text-sm hover:bg-[var(--muted)]'
            onClick={onClose}
            aria-label='Close'
          >
            ×
          </button>
        </div>

        <dl className='grid gap-3 text-sm'>
          <div className='grid gap-1'>
            <dt className='font-medium text-[var(--muted-foreground)]'>When</dt>
            <dd>{formatEventWhen(event)}</dd>
          </div>
          {event.location ? (
            <div className='grid gap-1'>
              <dt className='font-medium text-[var(--muted-foreground)]'>
                Location
              </dt>
              <dd className='grid gap-1'>
                <a
                  href={buildOsmSearchUrl(event.location)}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline underline-offset-2 hover:opacity-80'
                >
                  {event.location}
                </a>
                <span className='text-xs text-[var(--muted-foreground)]'>
                  Opens in OpenStreetMap
                </span>
              </dd>
            </div>
          ) : null}
          {event.description ? (
            <div className='grid gap-1'>
              <dt className='font-medium text-[var(--muted-foreground)]'>
                Details
              </dt>
              <dd className='whitespace-pre-wrap'>{event.description}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
};
