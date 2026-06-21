'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useState } from 'react';

type CalendarSubscribeLinksProps = {
  baseUrl: string;
  birthdayUrl?: string | null;
};

const CopyFeedButton = ({ label, url }: { label: string; url: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li className='flex flex-wrap items-center gap-2'>
      <span>{label}</span>
      <button
        type='button'
        className='inline-flex items-center rounded border border-[var(--border)] p-1.5 hover:bg-[var(--muted)]'
        onClick={() => void copy()}
        aria-label={`Copy ${label} feed URL`}
        title='Copy feed URL'
      >
        <ContentCopyIcon sx={{ fontSize: 18 }} />
      </button>
      {copied ? (
        <span className='text-xs text-[var(--muted-foreground)]'>Copied</span>
      ) : null}
    </li>
  );
};

export const CalendarSubscribeLinks = ({
  baseUrl,
  birthdayUrl,
}: CalendarSubscribeLinksProps) => (
  <div className='grid gap-2 text-sm'>
    <p className='font-semibold'>Subscribe (.ics)</p>
    <ul className='grid gap-2 pl-0 list-none'>
      <CopyFeedButton
        label='Council events'
        url={`${baseUrl}/api/calendar/council.ics`}
      />
      <CopyFeedButton
        label='Member events'
        url={`${baseUrl}/api/calendar/member-events.ics`}
      />
      {birthdayUrl ? (
        <CopyFeedButton label='Birthdays (private)' url={birthdayUrl} />
      ) : null}
    </ul>
  </div>
);
