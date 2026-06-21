'use client';

import { createContext, type ReactNode, useContext } from 'react';
import { prettifyError } from 'zod';
import config from '@/data/council.json' with { type: 'json' };
import { CouncilConfigSchema } from '@/schema/council';
import type { CouncilConfig } from '@/types/council';

const parseResult = CouncilConfigSchema.safeParse(config);

export const councilConfig: CouncilConfig = parseResult?.success
  ? {
      ...parseResult.data,
      complete: true,
    }
  : {
      complete: false,
      errorMessage: prettifyError(parseResult?.error) ?? 'Council not found',
      council: undefined,
    };

export const CouncilContext = createContext<CouncilConfig>({
  complete: false,
  errorMessage: 'Council not found',
  council: undefined,
});

export default function CouncilProvider({ children }: { children: ReactNode }) {
  return (
    <CouncilContext.Provider value={councilConfig}>
      {children}
    </CouncilContext.Provider>
  );
}

export const useConfig = () => {
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
