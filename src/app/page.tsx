'use client';

import Typography from '@mui/material/Typography';
import Image from 'next/image';

import { useConfig } from '@/providers/council';

export default function Home() {
  const { complete, council, errorMessage } = useConfig();

  const mainBody = council
    ? (
        <main className='flex flex-col object-top gap-[32px] row-start-2 items-center sm:items-start'>
          <div className='flex gap-4 items-center flex-col sm:flex-row'>
            <div className='flex flex-col items-center'>
              <Image
                alt='Council Logo'
                className='dark:block not-dark:hidden h-auto w-full max-w-lg'
                height={128}
                priority
                src='/kofc_r_hz_rgb_rev.png'
                style={{ height: 'auto', maxWidth: '32rem', width: '100%' }}
                width={512}
              />
              <Image
                alt='Council Logo'
                className='not-dark:block dark:hidden h-auto w-full max-w-lg'
                height={128}
                priority
                src='/kofc_r_hz_rgb_pos.png'
                style={{ height: 'auto', maxWidth: '32rem', width: '100%' }}
                width={512}
              />
              <Typography component='h1' gutterBottom variant='h4'>
                {`Council #${council.number}`}
              </Typography>
              <Typography
                classes='dark:text-white not-dark:text-black'
                component='h2'
                variant='h6'
              >
                {`${council.number} - ${council.parish.name}`}
              </Typography>
              <Typography
                classes='dark:text-white not-dark:text-black'
                component='p'
                variant='body2'
              >
                {`Meeting at ${council.meetingTimes.council.time} ${council.meetingTimes.council.frequency} on the ${council.meetingTimes.council.day}`}
              </Typography>
            </div>
          </div>
        </main>
      )
    : null;
  const errorBody = (
    <main className='flex flex-col gap-[32px] row-start-2 items-center sm:items-start'>
      <div className='font-mono text-sm/6 text-center sm:text-left'>
        <p className='mb-2 tracking-[-.01em]'>
          Oops! It looks like the council configuration is incomplete or
          invalid.
        </p>
        <p className='tracking-[-.01em]'>
          Please contact your site representative to correct it.
        </p>
        <code color='red'>{errorMessage}</code>
      </div>
    </main>
  );

  return <div className=''>{complete ? mainBody : errorBody}</div>;
}
