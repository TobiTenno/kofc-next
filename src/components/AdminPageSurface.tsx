'use client';

import type { ReactNode } from 'react';
import { AdminPageHeader } from '@/components/AdminPageHeader';

const maxWidthClass = {
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '5xl': 'max-w-5xl',
  full: '',
} as const;

export type AdminPageSurfaceProps = {
  title: string;
  description?: ReactNode;
  /** When set, shows cog + Manage in the header title row. */
  onManage?: () => void;
  manageAriaLabel?: string;
  actions?: ReactNode;
  /** Content width. Default `2xl`. */
  maxWidth?: keyof typeof maxWidthClass;
  children?: ReactNode;
  className?: string;
};

/**
 * Admin page shell: standard header + changeable body (`children`).
 * Cards, lists, modals, and alerts go in the body.
 */
export const AdminPageSurface = ({
  title,
  description,
  onManage,
  manageAriaLabel,
  actions,
  maxWidth = '2xl',
  children,
  className,
}: AdminPageSurfaceProps) => {
  const width = maxWidthClass[maxWidth];
  return (
    <div className={['grid gap-6', width, className].filter(Boolean).join(' ')}>
      <AdminPageHeader
        title={title}
        description={description}
        onManage={onManage}
        manageAriaLabel={manageAriaLabel}
        actions={actions}
      />
      {children}
    </div>
  );
};
