import { GalleriesAdminPageClient } from '@/components/galleries/GalleriesAdminPageClient';
import { isImmichConfigured } from '@/lib/immich/client';

export default function GalleriesAdminPage() {
  return <GalleriesAdminPageClient immichConfigured={isImmichConfigured()} />;
}
