'use client';

import { createContext, type ReactNode, useContext } from 'react';
import type { CouncilConfig } from '@/types/council';

const CouncilContext = createContext<CouncilConfig | null>(null);

type CouncilProviderProps = {
  value: CouncilConfig;
  children: ReactNode;
};

export default function CouncilProvider({
  value,
  children,
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
      errorMessage: 'Council not found',
      council: undefined,
    };
  }
  return context;
};
