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
  it('rejects impossible calendar days', () => {
    expect(formatReportDate('2026-02-30')).toBe('');
    expect(formatReportDate('2026-09-99')).toBe('');
    expect(formatReportDate('2026-00-10')).toBe('');
  });
  it('accepts leap day when valid', () => {
    expect(formatReportDate('2024-02-29')).toBe('29 February 2024');
  });
});
