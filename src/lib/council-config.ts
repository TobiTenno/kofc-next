import fs from 'node:fs';
import { prettifyError } from 'zod';

import type { CouncilConfig } from '@/types/council';

import { getCouncilJsonPath } from '@/lib/council-paths';
import { CouncilConfigSchema } from '@/schema/council';

export const loadCouncilConfig = (): CouncilConfig => {
  const configPath = getCouncilJsonPath();

  if (!fs.existsSync(configPath)) {
    return {
      complete: false,
      council: undefined,
      errorMessage: 'Council config not found',
    };
  }

  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as unknown;
  const parseResult = CouncilConfigSchema.safeParse(raw);

  if (!parseResult.success) {
    return {
      complete: false,
      council: undefined,
      errorMessage: prettifyError(parseResult.error),
    };
  }

  return {
    ...parseResult.data,
    complete: true,
  };
};

export const writeCouncilConfig = (config: CouncilConfig): void => {
  const configPath = getCouncilJsonPath();
  const {
    complete: _complete,
    errorMessage: _errorMessage,
    ...persisted
  } = config;
  fs.writeFileSync(
    configPath,
    `${JSON.stringify(persisted, null, 2)}\n`,
    'utf8',
  );
};

export const councilConfigPath = (): string => getCouncilJsonPath();
