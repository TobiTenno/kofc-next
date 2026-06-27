'use client';

import Divider from '@mui/material/Divider';
import dynamic from 'next/dynamic';
import { useConfig } from '@/providers/council';

const MapBox = dynamic(() => import('@/components/MapBox'), { ssr: false });

export default function Page() {
  const { council } = useConfig();
  return (
    <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center gap-8'>
      <br />
      <div className='w-full max-w-7xl dark:bg-gray-900 not-dark:bg-gray-550 py-5 sm:py-10 border-amber-400 rounded-lg border shadow-xl/30 shadow-amber-400'>
        <div className='mx-auto grid max-w-7xl gap-10 px-6 lg:px-8 xl:grid-cols-2'>
          <div className='min-w-0 max-w-xl'>
            <h2 className='text-3xl font-semibold tracking-tight text-pretty dark:text-white not-dark:text-black sm:text-4xl'>
              Our Mission
            </h2>
            <p className='mt-6 text-lg/8 dark:text-gray-400 not-dark:text-gray-700'>
              We are dedicated to serving our community through charity, unity,
              and fraternity. Our council strives to make a positive impact by
              supporting local initiatives and fostering a sense of brotherhood
              among our members.
            </p>
          </div>
          <div className='min-w-0'>
            <div className='text-lg/8 dark:text-gray-300 not-dark:text-gray-700'>
              {council?.address.street} {council?.address.city},{' '}
              {council?.address.state} {council?.address.zipCode}
              <Divider className='my-4' />
              <MapBox />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
