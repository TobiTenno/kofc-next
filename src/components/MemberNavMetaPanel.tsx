import Link from 'next/link';
import { formatMemberClass } from '@/lib/member-class';
import type { MemberNavMeta } from '@/lib/member-nav';

type MemberNavMetaPanelProps = {
  meta: MemberNavMeta;
  variant?: 'default' | 'header';
  className?: string;
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

const formatDuesHeaderLabel = (
  dues: NonNullable<MemberNavMeta['dues']>,
): string => {
  const status = dues.paid ? 'Paid' : 'Unpaid';
  return dues.councilYear ? `${status} · ${dues.councilYear}` : status;
};

const duesLinkClass = (paid: boolean): string =>
  paid
    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
    : 'border-amber-400/40 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30';

export const MemberNavMetaPanel = ({
  meta,
  variant = 'default',
  className = '',
}: MemberNavMetaPanelProps) => {
  const memberClassLabel = formatMemberClass(meta.memberClass);
  const { dues } = meta;

  const duesHref = dues?.paid
    ? dues.detailsHref
    : (dues?.payHref ?? dues?.detailsHref);

  if (variant === 'header') {
    return (
      <div className={`min-w-0 ${className}`}>
        <p
          className='truncate text-sm font-medium leading-tight text-white/90'
          title={meta.displayName}
        >
          {meta.displayName}
        </p>
        <div className='mt-0.5 flex min-w-0 items-center gap-1.5'>
          <span
            className='shrink-0 font-mono text-[11px] leading-none text-white/60'
            title={`Member #${meta.membershipNumber}`}
          >
            #{meta.membershipNumber}
          </span>
          {dues && duesHref ? (
            <Link
              href={duesHref}
              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none touch-manipulation whitespace-nowrap ${duesLinkClass(dues.paid)}`}
              title={formatDuesLabel(dues)}
            >
              {formatDuesHeaderLabel(dues)}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-nowrap items-center gap-2 text-xs min-w-0 justify-end ${className}`}
    >
      {dues && duesHref ? (
        <Link
          href={duesHref}
          className={`shrink-0 rounded-full border px-2.5 py-1.5 font-medium touch-manipulation whitespace-nowrap ${duesLinkClass(dues.paid)}`}
          title={dues.paid || !dues.payHref ? 'View dues details' : 'Pay dues'}
        >
          {formatDuesLabel(dues)}
        </Link>
      ) : null}

      <div className='flex min-w-0 shrink items-center gap-1.5 text-white/60'>
        <span
          className='max-w-[10rem] truncate text-white/80'
          title={meta.displayName}
        >
          {meta.displayName}
        </span>
        {memberClassLabel ? (
          <span
            className='hidden shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-medium text-white/70 lg:inline'
            title={meta.memberClass ?? undefined}
          >
            {memberClassLabel}
          </span>
        ) : null}
        <span className='shrink-0 whitespace-nowrap font-mono text-white/80'>
          #{meta.membershipNumber}
        </span>
      </div>
    </div>
  );
};
