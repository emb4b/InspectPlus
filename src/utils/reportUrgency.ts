import { getUrgencyConfig } from '../services/config/urgencyConfig';

export type ReportUrgencyLevel = 'overdue' | 'due-soon' | 'none';

export interface ReportUrgency {
  level: ReportUrgencyLevel;
  // Whole days behind the label: how far past the deadline for 'overdue', how
  // much runway is left for 'due-soon', and 0 for 'none'. Kept on the result
  // so callers rendering "Overdue by 5 days" don't repeat the date maths.
  days: number;
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
