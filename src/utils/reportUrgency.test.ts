import { getReportUrgency } from './reportUrgency';

// The thresholds now come from the config module rather than ENV directly,
// so the tests drive them through a mutable mock of that module. jest.mock
// factories may only close over out-of-scope names prefixed with `mock`.
const mockThresholds = { dueSoonDays: 14, overdueDays: 30 };
jest.mock('../services/config/urgencyConfig', () => ({
  getUrgencyConfig: () => mockThresholds,
}));

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

describe('getReportUrgency', () => {
  beforeEach(() => {
    mockThresholds.dueSoonDays = 14;
    mockThresholds.overdueDays = 30;
  });

  it('never flags a submitted report, however old it is', () => {
    expect(getReportUrgency(daysAgo(400), 'submitted')).toEqual({ level: 'none', days: 0 });
  });

  it('returns none for an unparseable date rather than throwing', () => {
    expect(getReportUrgency('not-a-date', 'draft')).toEqual({ level: 'none', days: 0 });
  });

  it('leaves a draft younger than the due-soon threshold unflagged', () => {
    expect(getReportUrgency(daysAgo(2), 'draft')).toEqual({ level: 'none', days: 0 });
  });

  it('counts the days still remaining before overdue once a draft is due soon', () => {
    // 15 days old, overdue at 30 -> 15 days of runway left.
    expect(getReportUrgency(daysAgo(15), 'draft')).toEqual({ level: 'due-soon', days: 15 });
  });

  it('counts the days elapsed past the deadline once a draft is overdue', () => {
    // 45 days old, overdue at 30 -> 15 days past the deadline.
    expect(getReportUrgency(daysAgo(45), 'draft')).toEqual({ level: 'overdue', days: 15 });
  });

  it('reports zero days past the deadline on the day a draft tips into overdue', () => {
    expect(getReportUrgency(daysAgo(30), 'draft')).toEqual({ level: 'overdue', days: 0 });
  });

  it('takes the due-soon threshold from runtime config, not a hard-coded 14', () => {
    mockThresholds.dueSoonDays = 5;
    // A 6-day-old draft is unflagged under the default 14 but due soon at 5.
    expect(getReportUrgency(daysAgo(6), 'draft')).toEqual({ level: 'due-soon', days: 24 });
  });

  it('takes the overdue threshold from runtime config, not a hard-coded 30', () => {
    mockThresholds.overdueDays = 20;
    // A 25-day-old draft is only due-soon under the default 30, overdue at 20.
    expect(getReportUrgency(daysAgo(25), 'draft')).toEqual({ level: 'overdue', days: 5 });
  });
});
