import { formatReportDate } from './formatReportDate';

describe('formatReportDate', () => {
  it('prints an ISO date as DD Month YYYY', () => {
    expect(formatReportDate('2026-09-05')).toBe('05 September 2026');
  });
  it('accepts a full ISO timestamp and ignores the time', () => {
    expect(formatReportDate('2026-01-31T15:04:05.000Z')).toBe('31 January 2026');
  });
  it('returns an empty string for null, undefined, blank and garbage', () => {
    expect(formatReportDate(null)).toBe('');
    expect(formatReportDate(undefined)).toBe('');
    expect(formatReportDate('')).toBe('');
    expect(formatReportDate('not a date')).toBe('');
  });
});
