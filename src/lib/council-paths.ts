import path from 'node:path';

const DEFAULT_COUNCIL_JSON = 'src/data/council.json';
const DEFAULT_COUNCIL_CSV = 'src/data/council.csv';

export const resolveCouncilDataPath = (
  envValue: string | undefined,
  defaultRelativePath: string,
): string => {
  const value = envValue?.trim() || defaultRelativePath;
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
};

export const getCouncilJsonPath = (): string =>
  resolveCouncilDataPath(process.env.COUNCIL_JSON_PATH, DEFAULT_COUNCIL_JSON);

export const getCouncilCsvPath = (): string =>
  resolveCouncilDataPath(process.env.COUNCIL_CSV_PATH, DEFAULT_COUNCIL_CSV);
