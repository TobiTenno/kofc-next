/**
Month/day from roster birth dates (MM-DD-YYYY, M/D/YYYY, YYYY-MM-DD).
*/
export const parseMemberBirthMonthDay = (
  value: string,
): null | { day: number; month: number } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dashed = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashed) {
    return { day: Number(dashed[2]), month: Number(dashed[1]) };
  }

  const slashed = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashed) {
    return { day: Number(slashed[2]), month: Number(slashed[1]) };
  }

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return { day: Number(iso[3]), month: Number(iso[2]) };
  }

  return null;
};
