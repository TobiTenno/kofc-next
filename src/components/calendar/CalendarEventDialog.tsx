'use client';

import { Modal, useOverlayState } from '@heroui/react';
import type { CalendarPreviewEvent } from '@/lib/calendar/calendar-event-types';
import { calendarEventKindLabel } from '@/lib/calendar/calendar-event-types';
import dayjs from '@/lib/calendar/dayjs';
import { buildOsmSearchUrl } from '@/lib/openstreetmap';

type CalendarEventDialogProps = {
  event: CalendarPreviewEvent;
  onClose: () => void;
};

const formatEventWhen = (event: CalendarPreviewEvent): string => {
  const start = dayjs(event.start);
  const end = dayjs(event.end);

  if (event.allDay) {
    const lastDay = end.subtract(1, 'day');
    if (start.isSame(lastDay, 'day')) {
      return start.format('dddd, MMMM D, YYYY');
    }

    return `${start.format('MMM D, YYYY')} – ${lastDay.format('MMM D, YYYY')}`;
  }

  if (start.isSame(end, 'day')) {
    return `${start.format('dddd, MMMM D, YYYY')} · ${start.format('h:mm A')} – ${end.format('h:mm A')}`;
  }

  return `${start.format('MMM D, YYYY h:mm A')} – ${end.format('MMM D, YYYY h:mm A')}`;
};

export const CalendarEventDialog = ({
  event,
  onClose,
}: CalendarEventDialogProps) => {
  const overlay = useOverlayState({
    isOpen: true,
    onOpenChange: (open) => {
      if (!open) {
        onClose();
      }
    },
  });

  return (
    <Modal state={overlay}>
      <Modal.Backdrop variant='blur'>
        <Modal.Container placement='center' size='md'>
          <Modal.Dialog aria-labelledby='calendar-event-title'>
            <Modal.Header className='items-start gap-4'>
              <div className='grid min-w-0 flex-1 gap-1'>
                <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                  {calendarEventKindLabel[event.kind]}
                </p>
                <Modal.Heading
                  id='calendar-event-title'
                  className='text-xl font-semibold'
                >
                  {event.title}
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger aria-label='Close' />
            </Modal.Header>

            <Modal.Body>
              <dl className='grid gap-4 text-sm'>
                <div className='grid gap-1'>
                  <dt className='font-medium text-muted-foreground'>When</dt>
                  <dd>{formatEventWhen(event)}</dd>
                </div>
                {event.location ? (
                  <div className='grid gap-1'>
                    <dt className='font-medium text-muted-foreground'>
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
                      <span className='text-xs text-muted-foreground'>
                        Opens in OpenStreetMap
                      </span>
                    </dd>
                  </div>
                ) : null}
                {event.description ? (
                  <div className='grid gap-1'>
                    <dt className='font-medium text-muted-foreground'>
                      Details
                    </dt>
                    <dd className='whitespace-pre-wrap'>{event.description}</dd>
                  </div>
                ) : null}
              </dl>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
