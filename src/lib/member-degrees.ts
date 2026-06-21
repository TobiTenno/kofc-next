type DegreeMember = {
  firstDegreeDate?: string | null;
  secondDegreeDate?: string | null;
  thirdDegreeDate?: string | null;
  fourthDegreeDate?: string | null;
};

export const degreeDateFields = [
  { key: 'firstDegreeDate' as const, label: '1°' },
  { key: 'secondDegreeDate' as const, label: '2°' },
  { key: 'thirdDegreeDate' as const, label: '3°' },
  { key: 'fourthDegreeDate' as const, label: '4°' },
];

export const formatDegreeDate = (value: string | null | undefined): string => {
  if (!value?.trim()) {
    return '—';
  }

  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    return value.trim();
  }

  return `${match[1]}/${match[2]}/${match[3]}`;
};

export const getHighestDegreeLabel = (member: DegreeMember): string | null => {
  if (member.fourthDegreeDate?.trim()) {
    return '4th Degree';
  }

  if (member.thirdDegreeDate?.trim()) {
    return '3rd Degree';
  }

  if (member.secondDegreeDate?.trim()) {
    return '2nd Degree';
  }

  if (member.firstDegreeDate?.trim()) {
    return '1st Degree';
  }

  return null;
};

export const getHighestDegreeRank = (member: DegreeMember): number => {
  if (member.fourthDegreeDate?.trim()) {
    return 4;
  }

  if (member.thirdDegreeDate?.trim()) {
    return 3;
  }

  if (member.secondDegreeDate?.trim()) {
    return 2;
  }

  if (member.firstDegreeDate?.trim()) {
    return 1;
  }

  return 0;
};

export const parseDegreeDate = (
  value: string | null | undefined,
): number | null => {
  if (!value?.trim()) {
    return null;
  }

  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    return null;
  }

  return new Date(
    Number(match[3]),
    Number(match[1]) - 1,
    Number(match[2]),
  ).getTime();
};
