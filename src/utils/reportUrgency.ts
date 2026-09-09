import { getUrgencyConfig } from '../services/config/urgencyConfig';

export type ReportUrgencyLevel = 'overdue' | 'due-soon' | 'none';

export interface ReportUrgency {
  level: ReportUrgencyLevel;
  // Whole days behind the label: how far past the deadline for 'overdue', how
  // much runway is left for 'due-soon', and 0 for 'none'. Kept on the result
  // so callers rendering "Overdue by 5 days" don't repeat the date maths.
  days: number;
}

// An establishment's roll-up of its own reports: the colour it should wear
// and how many reports are asking for attention.
export interface DueReportsSummary {
  // The worst state present, which is what the indicator's colour shows.
  level: Exclude<ReportUrgencyLevel, 'none'>;
  // Every flagged report, not just the ones at `level`.
  count: number;
}

const NONE: ReportUrgency = { level: 'none', days: 0 };
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Draft reports that sit too long after the inspection date risk missing
// filing deadlines. Submitted reports are already filed, so they're never
// flagged regardless of age. Both windows are operator-controlled — see
// src/services/config/urgencyConfig.ts for how they resolve.
export function getReportUrgency(dateIso: string, status: string | null): ReportUrgency {
  if (status === 'submitted') return NONE;

  const inspectionDate = new Date(dateIso).getTime();
  if (Number.isNaN(inspectionDate)) return NONE;

  const { dueSoonDays, overdueDays } = getUrgencyConfig();
  const daysSince = (Date.now() - inspectionDate) / MS_PER_DAY;

  // Floor: the deadline day itself reads as "Overdue", and only a full day
  // past it becomes "Overdue by 1 day".
  if (daysSince >= overdueDays) {
    return { level: 'overdue', days: Math.floor(daysSince - overdueDays) };
  }
  // Ceil: any part of a day still counts as a day of runway, so this never
  // reaches a misleading "Due in 0 days".
  if (daysSince >= dueSoonDays) {
    return { level: 'due-soon', days: Math.ceil(overdueDays - daysSince) };
  }
  return NONE;
}

// Rolls a set of reports up into the single indicator an establishment wears.
//
// The count deliberately spans both states rather than just the worst one.
// Counting only the worst tier makes the number move the wrong way as things
// deteriorate: an establishment with 1 overdue and 5 due-soon would read "1"
// while a strictly healthier one with 5 due-soon read "5". Splitting the two
// channels — colour for severity, number for volume — keeps both readable at
// a glance and keeps the count monotonic as reports slip.
export function summarizeDueReports(
  reports: { date: string; status: string | null }[],
): DueReportsSummary | null {
  let count = 0;
  let anyOverdue = false;

  reports.forEach(report => {
    const { level } = getReportUrgency(report.date, report.status);
    if (level === 'none') return;
    count += 1;
    if (level === 'overdue') anyOverdue = true;
  });

  if (count === 0) return null;
  return { level: anyOverdue ? 'overdue' : 'due-soon', count };
}

const plural = (days: number) => (days === 1 ? 'day' : 'days');

// Abbreviated for places that are tight — the corner ribbon's diagonal, a
// chip sharing a row with other badges. Both callers must agree on this
// wording, or the same report reads differently in a list and on its own
// screen.
export function urgencyShortLabel(urgency: ReportUrgency): string {
  if (urgency.level === 'due-soon') return `${urgency.days}d left`;
  if (urgency.days === 0) return 'Overdue';
  return `${urgency.days}d late`;
}

// What a screen reader gets instead: "5d late" is not something to read out.
export function urgencySpokenLabel(urgency: ReportUrgency): string {
  if (urgency.level === 'due-soon') return `Due in ${urgency.days} ${plural(urgency.days)}`;
  if (urgency.days === 0) return 'Overdue';
  return `Overdue by ${urgency.days} ${plural(urgency.days)}`;
}
