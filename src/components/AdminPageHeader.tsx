'use client';

import type { ReactNode } from 'react';
import { AdminManageButton } from '@/components/AdminManageButton';

type AdminPageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** When set, shows cog + Manage in the upper-right of the title row. */
  onManage?: () => void;
  manageAriaLabel?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Standard admin page header: title + optional Manage (upper right),
 * description on the next row so the button never wraps under copy.
 */
export const AdminPageHeader = ({
  title,
  description,
  onManage,
  manageAriaLabel = 'Manage',
  actions,
  className,
}: AdminPageHeaderProps) => (
  <div className={['grid gap-1', className].filter(Boolean).join(' ')}>
    <div className='flex items-start justify-between gap-3'>
      <h1 className='text-2xl font-bold'>{title}</h1>
      <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
        {actions}
        {onManage ? (
          <AdminManageButton aria-label={manageAriaLabel} onPress={onManage} />
        ) : null}
      </div>
    </div>
    {description ? (
      <div className='text-sm text-muted-foreground'>{description}</div>
    ) : null}
  </div>
);
