import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { MemberSubNav } from '@/components/MemberSubNav';
import { SiteNav } from '@/components/SiteNav';
import { loadCouncilConfig } from '@/lib/council-config';
import { isPayPalConfigured } from '@/lib/dues';
import { buildMemberNavContext } from '@/lib/member-nav';
import { getMembershipNumber, getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const SiteHeader = async () => {
  const { council } = loadCouncilConfig();
  const session = await getSession();
  const membershipNumber = session ? await getMembershipNumber() : null;
  const memberContext = membershipNumber
    ? await buildMemberNavContext(membershipNumber)
    : null;
  const impersonating = Boolean(session?.session.impersonatedBy);

  return (
    <>
      {impersonating && membershipNumber && memberContext
        ? (
            <ImpersonationBanner
              displayName={memberContext.meta.displayName}
              membershipNumber={membershipNumber}
            />
          )
        : null}
      <header className='relative z-[100] mx-auto w-full max-w-7xl min-w-0 rounded-xl text-white dark:bg-gray-950 not-dark:bg-blue-950'>
        <SiteNav
          councilName={council?.name}
          memberLinks={memberContext?.links ?? null}
          memberMeta={memberContext?.meta ?? null}
          membershipNumber={membershipNumber}
          showPayDuesLink={isPayPalConfigured()}
        />
        {memberContext ? <MemberSubNav context={memberContext} /> : null}
      </header>
    </>
  );
};
