import { redirect } from 'next/navigation';

export default function GallerySettingsRedirectPage() {
  redirect('/members/admin/galleries');
}
