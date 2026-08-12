'use client';

import { createContext, type ReactNode, useContext } from 'react';

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
  return (
    <CouncilContext.Provider value={value}>{children}</CouncilContext.Provider>
  );
}

export const useConfig = (): CouncilConfig => {
  const context = useContext(CouncilContext);
  if (!context) {
    return {
      complete: false,
      council: undefined,
      errorMessage: 'Council not found',
    };
  }
  return context;
};
