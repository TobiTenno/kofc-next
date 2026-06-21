'use client';

import Typography from '@mui/material/Typography';
import Image from 'next/image';
import { useConfig } from '@/providers/council';

export default function Home() {
  const { council, complete, errorMessage } = useConfig();

  const mainBody = council ? (
    <main className='flex flex-col object-top gap-[32px] row-start-2 items-center sm:items-start'>
      <div className='flex gap-4 items-center flex-col sm:flex-row'>
        <div className={'flex flex-col items-center'}>
          <Image
            className='dark:block not-dark:hidden h-auto w-full max-w-lg'
            src='/kofc_r_hz_rgb_rev.png'
            alt='Council Logo'
            width={512}
            height={128}
            priority
            style={{ height: 'auto', width: '100%', maxWidth: '32rem' }}
          />
          <Image
            className='not-dark:block dark:hidden h-auto w-full max-w-lg'
            src='/kofc_r_hz_rgb_pos.png'
            alt='Council Logo'
            width={512}
            height={128}
            priority
            style={{ height: 'auto', width: '100%', maxWidth: '32rem' }}
          />
          <Typography variant='h4' component='h1' gutterBottom>
            Council #{council.number}
          </Typography>
          <Typography
            variant='h6'
            component='h2'
            classes={'dark:text-white not-dark:text-black'}
          >
            {council.number} - {council.parish.name}
          </Typography>
          <Typography
            variant='body2'
            component='p'
            classes={'dark:text-white not-dark:text-black'}
          >
            Meeting at {council.meetingTimes.council.time}{' '}
            {council.meetingTimes.council.frequency} on the{' '}
            {council.meetingTimes.council.day}
          </Typography>
        </div>
      </div>
    </main>
  ) : null;
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
        <code color={'red'}>{errorMessage}</code>
      </div>
    </main>
  );

  return <div className=''>{complete ? mainBody : errorBody}</div>;
}
