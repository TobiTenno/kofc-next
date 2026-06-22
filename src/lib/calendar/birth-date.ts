/** Month/day from roster birth dates (MM-DD-YYYY, M/D/YYYY, YYYY-MM-DD). */
export const parseMemberBirthMonthDay = (
  value: string,
): { month: number; day: number } | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dashed = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashed) {
    return { month: Number(dashed[1]), day: Number(dashed[2]) };
  }

  const slashed = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashed) {
    return { month: Number(slashed[1]), day: Number(slashed[2]) };
  }

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return { month: Number(iso[2]), day: Number(iso[3]) };
  }

  return null;
};
