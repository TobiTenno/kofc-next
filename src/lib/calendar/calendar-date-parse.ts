/**
Parse YYYY-MM-DD as local calendar midnight (for all-day display).
*/
export const parseCalendarDateLocal = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};
