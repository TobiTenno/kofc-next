export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

import { RosterTable } from '@/components/roster/RosterTable';
import { db } from '@/db';
import { members } from '@/db/schema';
import {
  getPaidMembershipNumbersForCouncilYear,
  isDuesConfigured,
} from '@/lib/dues';
import {
  canSendRosterEmail,
  canUseRosterAdminTools,
  canViewRoster,
} from '@/lib/officers';
import { getCurrentCouncilYear } from '@/lib/permissions-sync';
import { serializeRosterMembers } from '@/lib/roster';
import { requireMembershipNumber } from '@/lib/session';

export default async function RosterPage() {
  const membershipNumber = await requireMembershipNumber();

  if (!(await canViewRoster(membershipNumber))) {
    redirect('/members/calendar');
  }

  const [roster, canSendEmail, canUseDuesTools, duesConfigured, councilYear]
    = await Promise.all([
      db.select().from(members),
      canSendRosterEmail(membershipNumber),
      canUseRosterAdminTools(membershipNumber),
      isDuesConfigured(),
      getCurrentCouncilYear(),
    ]);

  const showDuesTools = canUseDuesTools && duesConfigured;

  const paidMembershipNumbers
    = showDuesTools && councilYear
      ? [...(await getPaidMembershipNumbersForCouncilYear(councilYear))]
      : [];

  const rows = serializeRosterMembers(roster);

  return (
    <div>
      <h1 className='text-2xl font-bold mb-4'>Council Roster</h1>
      <p className='mb-4 text-sm text-muted-foreground'>
        Visible to council officers and the webmaster.
        {showDuesTools && councilYear
          ? ` Dues status reflects council year ${councilYear}.`
          : null}
      </p>
      <RosterTable
        canSendEmail={canSendEmail}
        councilYear={showDuesTools ? councilYear : null}
        members={rows}
        paidMembershipNumbers={paidMembershipNumbers}
        showDuesTools={showDuesTools}
      />
    </div>
  );
}
