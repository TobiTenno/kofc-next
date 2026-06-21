import Link from 'next/link';
import { formatMemberClass } from '@/lib/member-class';
import type { MemberNavMeta } from '@/lib/member-nav';

type MemberNavMetaPanelProps = {
  meta: MemberNavMeta;
  compact?: boolean;
};

const formatDuesLabel = (dues: NonNullable<MemberNavMeta['dues']>): string => {
  const parts = ['Dues'];

  if (dues.councilYear) {
    parts.push(dues.councilYear);
  }

  parts.push(`(${dues.paid ? 'paid' : 'unpaid'})`);

  if (dues.amountLabel) {
    parts.push(`$${dues.amountLabel}`);
  }

  return parts.join(' · ');
};

export const MemberNavMetaPanel = ({
  meta,
  compact = false,
}: MemberNavMetaPanelProps) => {
  const memberClassLabel = formatMemberClass(meta.memberClass);
  const { dues } = meta;

  const duesHref = dues?.paid
    ? dues.detailsHref
    : (dues?.payHref ?? dues?.detailsHref);

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-xs ${
        compact ? 'w-full justify-between' : 'justify-end'
      }`}
    >
      {dues && duesHref ? (
        <Link
          href={duesHref}
          className={`shrink-0 rounded-full border px-2.5 py-1.5 font-medium touch-manipulation whitespace-nowrap ${
            dues.paid
              ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
              : 'border-amber-400/40 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
          }`}
          title={dues.paid || !dues.payHref ? 'View dues details' : 'Pay dues'}
        >
          {formatDuesLabel(dues)}
        </Link>
      ) : (
        <span className='flex-1' />
      )}

      <div className='flex shrink-0 items-center gap-1.5 text-white/60'>
        <span className='hidden max-w-[8rem] truncate sm:inline md:max-w-[10rem]'>
          {meta.displayName}
        </span>
        {memberClassLabel ? (
          <span
            className='hidden rounded bg-white/10 px-1.5 py-0.5 font-medium text-white/70 lg:inline'
            title={meta.memberClass ?? undefined}
          >
            {memberClassLabel}
          </span>
        ) : null}
        <span className='font-mono text-white/80'>
          #{meta.membershipNumber}
        </span>
      </div>
    </div>
  );
};
