import { notFound } from 'next/navigation';
import { GalleriesAdmin } from '@/components/galleries/GalleriesAdmin';
import { isImmichConfigured } from '@/lib/immich/client';

export default function GalleriesAdminPage() {
  if (!isImmichConfigured()) {
    notFound();
  }

  return <GalleriesAdmin />;
}
