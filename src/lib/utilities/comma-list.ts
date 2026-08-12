export const parseCommaSeparatedList = (value: string): string[] =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

export const formatCommaSeparatedList = (values: string[]): string =>
  values.join(', ');
