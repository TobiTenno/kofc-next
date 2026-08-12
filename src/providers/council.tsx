'use client';

import { createContext, type ReactNode, use } from 'react';

import type { CouncilConfig } from '@/types/council';

const CouncilContext = createContext<CouncilConfig | null>(null);

type CouncilProviderProps = {
  children: ReactNode;
  value: CouncilConfig;
};

export default function CouncilProvider({
  children,
  value,
}: CouncilProviderProps) {
  return <CouncilContext value={value}>{children}</CouncilContext>;
}

export const useConfig = (): CouncilConfig => {
  const context = use(CouncilContext);
  if (!context) {
    return {
      complete: false,
      council: undefined,
      errorMessage: 'Council not found',
    };
  }
  return context;
};
