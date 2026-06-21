import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export const getSession = async () => {
  noStore();
  return auth.api.getSession({
    headers: await headers(),
  });
};

export const getMembershipNumber = async (): Promise<string | null> => {
  const session = await getSession();
  return session?.user.username ?? null;
};

export const requireMembershipNumber = async (): Promise<string> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    throw new Error('Unauthorized');
  }
  return membershipNumber;
};
