'use client';

import type { ReactNode } from 'react';

import { AdminPageHeader } from '@/components/AdminPageHeader';

const maxWidthClass = {
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '5xl': 'max-w-5xl',
  'full': '',
  'xl': 'max-w-xl',
} as const;

export type AdminPageSurfaceProps = {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  manageAriaLabel?: string;
  /**
  Content width. Default `2xl`.
  */
  maxWidth?: keyof typeof maxWidthClass;
  /**
  When set, shows cog + Manage in the header title row.
  */
  onManage?: () => void;
  title: string;
};

/**
 * Admin page shell: standard header + changeable body (`children`).
 * Cards, lists, modals, and alerts go in the body.
 */
export const AdminPageSurface = ({
  actions,
  children,
  className,
  description,
  manageAriaLabel,
  maxWidth = '2xl',
  onManage,
  title,
}: AdminPageSurfaceProps) => {
  const width = maxWidthClass[maxWidth];
  return (
    <div className={['grid gap-6', width, className].filter(Boolean).join(' ')}>
      <AdminPageHeader
        actions={actions}
        description={description}
        manageAriaLabel={manageAriaLabel}
        onManage={onManage}
        title={title}
      />
      {children}
    </div>
  );
};
