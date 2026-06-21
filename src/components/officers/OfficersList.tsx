'use client';

import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import PhoneIcon from '@mui/icons-material/Phone';
import Image from 'next/image';
import Link from 'next/link';
import { useConfig } from '@/providers/council';
import { ImageName } from '@/schema/council';

type OfficersListProps = {
  showContactInfo: boolean;
};

export const OfficersList = ({ showContactInfo }: OfficersListProps) => {
  const { council } = useConfig();

  return (
    <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center gap-8'>
      <br />
      <div className='dark:bg-gray-900 not-dark:bg-gray-550 py-5 sm:py-10 border-amber-400 rounded-lg border shadow-xl/30 shadow-amber-400'>
        <div className='mx-auto grid max-w-7xl gap-20 px-6 lg:px-8 xl:grid-cols-3'>
          <div className='max-w-xl'>
            <h2 className='text-3xl font-semibold tracking-tight text-pretty dark:text-white not-dark:text-black sm:text-4xl'>
              Meet our officers
            </h2>
            {!showContactInfo ? (
              <p className='mt-6 text-sm text-gray-400'>
                <Link href='/members/login' className='underline'>
                  Sign in
                </Link>{' '}
                to view officer contact information.
              </p>
            ) : null}
          </div>
          <ul className='grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 xl:col-span-2 sm:col-span-3 xs:col-span-3'>
            {council?.officers?.filter(Boolean).map((officer) => (
              <li key={officer?.name}>
                <div className='flex items-center gap-x-6 rounded-lg border border-gray-200 p-1'>
                  <Image
                    width={61}
                    height={0}
                    src={officer.avatar || ImageName[officer.position]}
                    alt={officer.position}
                    className='h-auto w-auto rounded-full object-bottom-center outline-1 -outline-offset-1 outline-white/10'
                  />
                  <div>
                    <h3 className='text-base/7 font-semibold tracking-tight dark:text-white not-dark:text-black'>
                      {officer.name}
                    </h3>
                    <p className='text-sm/6 font-semibold text-indigo-400'>
                      {officer.position}
                    </p>
                    {officer.termEnd ? (
                      <p className='text-sm/6 font-semibold dark:text-gray-400 not-dark:text-gray-700'>
                        Term Ends: {officer.termEnd || 'N/A'}
                      </p>
                    ) : null}
                    {showContactInfo && officer.email ? (
                      <p className='text-sm/6 font-semibold dark:text-gray-400 not-dark:text-gray-700'>
                        <AlternateEmailIcon fontSize='small' />:{' '}
                        <a href={`mailto:${officer.email}`}>{officer.email}</a>
                      </p>
                    ) : null}
                    {showContactInfo && officer.phone ? (
                      <p className='text-sm/6 font-semibold dark:text-gray-400 not-dark:text-gray-700'>
                        <PhoneIcon fontSize='small' />:{' '}
                        <a
                          href={`tel:${officer.phone.replace(/[\s.+]+/g, '')}`}
                        >
                          {officer.phone}
                        </a>
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
