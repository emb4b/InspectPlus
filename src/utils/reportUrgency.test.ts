import { getReportUrgency } from './reportUrgency';

// The thresholds now come from ENV rather than module-local constants, so the
// tests drive them through a mutable mock instead of hard-coding 14/30 —
// that's the whole point of moving them into config. jest.mock factories may
// only close over out-of-scope names prefixed with `mock`.
const mockEnv = { dueSoonDays: 14, overdueDays: 30 };
jest.mock('../core/config/env', () => ({
  get ENV() {
    return mockEnv;
  },
}));

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

describe('getReportUrgency', () => {
  beforeEach(() => {
    mockEnv.dueSoonDays = 14;
    mockEnv.overdueDays = 30;
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

  it('takes the due-soon threshold from config, not a hard-coded 14', () => {
    mockEnv.dueSoonDays = 5;
    // A 6-day-old draft is unflagged under the default 14 but due soon at 5.
    expect(getReportUrgency(daysAgo(6), 'draft')).toEqual({ level: 'due-soon', days: 24 });
  });

  it('takes the overdue threshold from config, not a hard-coded 30', () => {
    mockEnv.overdueDays = 20;
    // A 25-day-old draft is only due-soon under the default 30, overdue at 20.
    expect(getReportUrgency(daysAgo(25), 'draft')).toEqual({ level: 'overdue', days: 5 });
  });
});
