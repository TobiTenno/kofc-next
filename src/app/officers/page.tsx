import { OfficersList } from '@/components/officers/OfficersList';
import { getMembershipNumber } from '@/lib/session';

export default async function OfficersPage() {
  const membershipNumber = await getMembershipNumber();

  return <OfficersList showContactInfo={Boolean(membershipNumber)} />;
}
