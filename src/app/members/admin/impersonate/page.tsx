import { redirect } from 'next/navigation';

import ImpersonateAdminClient from '@/app/members/admin/impersonate/ImpersonateAdminClient';
import { isWebmaster } from '@/lib/permissions-sync';
import { getSession } from '@/lib/session';

export default async function ImpersonateAdminPage() {
  const session = await getSession();
  const membershipNumber = session?.user.username;

  if (!session || !membershipNumber) {
    redirect('/members/login?next=/members/admin/impersonate');
  }
  else if (session.session.impersonatedBy) {
    redirect('/members');
  }
  else if (!isWebmaster(membershipNumber)) {
    redirect('/members');
  }

  return <ImpersonateAdminClient />;
}
