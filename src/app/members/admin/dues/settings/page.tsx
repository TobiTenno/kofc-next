import { redirect } from 'next/navigation';

export default function DuesSettingsRedirectPage() {
  redirect('/members/admin/dues');
}
