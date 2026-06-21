import { notFound } from 'next/navigation';
import { GalleryDetail } from '@/components/galleries/GalleryDetail';
import { isImmichConfigured } from '@/lib/immich/client';

export default function GalleryDetailPage() {
  if (!isImmichConfigured()) {
    notFound();
  }

  return <GalleryDetail />;
}
