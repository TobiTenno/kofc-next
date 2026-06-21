import fs from 'node:fs';
import { prettifyError } from 'zod';
import { getCouncilJsonPath } from '@/lib/council-paths';
import { CouncilConfigSchema } from '@/schema/council';
import type { CouncilConfig } from '@/types/council';

export const loadCouncilConfig = (): CouncilConfig => {
  const configPath = getCouncilJsonPath();

  if (!fs.existsSync(configPath)) {
    return {
      complete: false,
      errorMessage: 'Council config not found',
      council: undefined,
    };
  }

  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as unknown;
  const parseResult = CouncilConfigSchema.safeParse(raw);

  if (!parseResult.success) {
    return {
      complete: false,
      errorMessage: prettifyError(parseResult.error),
      council: undefined,
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
