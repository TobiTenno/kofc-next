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
      <div
        className='grid grid-cols-12 dark:bg-gray-900 py-5 sm:py-10 text-black dark:text-white border-amber-400 rounded-lg border shadow-xl/30 shadow-amber-400'
        style={{ height: '100%' }}
      >
        <div className='grid max-w-7xl lg:px-8 xl:col-span-6 sm:col-span-12'>
          <div className='max-w-xl'>
            <h2 className='text-3xl font-semibold tracking-tight text-pretty dark:text-white sm:text-4xl'>
              Our Mission
            </h2>
            <p className='mt-6 text-lg/8 dark:text-gray-400'>
              We are dedicated to serving our community through charity, unity,
              and fraternity. Our council strives to make a positive impact by
              supporting local initiatives and fostering a sense of brotherhood
              among our members.
            </p>
          </div>
        </div>
        <div className='grid max-x-7xl lg:px-8 xl:col-span-6 sm:col-span-12'>
          <div className='mt-6 text-lg/8 dark:text-gray-300'>
            {council?.address.street} {council?.address.city},{' '}
            {council?.address.state} {council?.address.zipCode}
            <Divider color={'bg-gray-500'} />
            <br />
            <MapBox />
          </div>
        </div>
      </div>
    </div>
  );
}
