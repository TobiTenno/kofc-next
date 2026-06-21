import { notFound } from 'next/navigation';
import { GalleryList } from '@/components/galleries/GalleryList';
import { isImmichConfigured } from '@/lib/immich/client';

export default function GalleriesPage() {
  if (!isImmichConfigured()) {
    notFound();
  }

  return <GalleryList />;
}
