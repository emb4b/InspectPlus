// Accepts progressively less specific dates — mm-dd-yyyy, mm-yyyy, or just
// yyyy — for cases like "date the establishment became closed/non-operational"
// where an inspector may only know the year, or the month and year.

// Strips non-digits as the user types and inserts dashes once enough digits
// are known to disambiguate the shape: <=4 digits stays a bare year, 5-6
// digits becomes mm-yyyy, 7-8 becomes mm-dd-yyyy.
export function maskFlexibleDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

export function isValidFlexibleDate(value: string): boolean {
  if (!value) return true;

  if (/^\d{4}$/.test(value)) {
    const year = Number(value);
    return year >= MIN_YEAR && year <= MAX_YEAR;
  }

  const mmYyyy = value.match(/^(\d{2})-(\d{4})$/);
  if (mmYyyy) {
    const month = Number(mmYyyy[1]);
    const year = Number(mmYyyy[2]);
    return month >= 1 && month <= 12 && year >= MIN_YEAR && year <= MAX_YEAR;
  }

  const mmDdYyyy = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (mmDdYyyy) {
    const month = Number(mmDdYyyy[1]);
    const day = Number(mmDdYyyy[2]);
    const year = Number(mmDdYyyy[3]);
    if (month < 1 || month > 12 || year < MIN_YEAR || year > MAX_YEAR) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    return day >= 1 && day <= daysInMonth;
  }

  return false;
}

export const FLEXIBLE_DATE_HINT = 'Format: mm-dd-yyyy, mm-yyyy, or at least yyyy';
export const FLEXIBLE_DATE_INVALID_HINT = 'Enter a valid date — mm-dd-yyyy, mm-yyyy, or yyyy';
