const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The date format every exported form uses ("05 September 2026"). Parses
// the YYYY-MM-DD prefix directly rather than through Date so a bare date
// can't drift a day across time zones.
export function formatReportDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return '';
  const month = Number(match[2]);
  if (month < 1 || month > 12) return '';
  return `${match[3]} ${MONTHS[month - 1]} ${match[1]}`;
}
