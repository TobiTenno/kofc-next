import Link from 'next/link';
import { GalleriesAdmin } from '@/components/galleries/GalleriesAdmin';
import { isImmichConfigured } from '@/lib/immich/client';

export default function GalleriesAdminPage() {
  if (!isImmichConfigured()) {
    return (
      <div className='grid max-w-xl gap-4'>
        <h1 className='text-2xl font-bold'>Galleries Admin</h1>
        <p className='text-sm text-muted-foreground'>
          Immich is not configured yet. Set the Immich URL and API key to create
          and manage galleries.
        </p>
        <Link
          href='/members/admin/galleries/settings'
          className='underline underline-offset-2'
        >
          Open Gallery Settings
        </Link>
      </div>
    );
  }

  return <GalleriesAdmin />;
}
