export type ReportUrgency = 'overdue' | 'due-soon' | 'none';

const DUE_SOON_DAYS = 14;
const OVERDUE_DAYS = 30;

// Draft reports that sit too long after the inspection date risk missing
// filing deadlines. Submitted reports are already filed, so they're never
// flagged regardless of age.
export function getReportUrgency(dateIso: string, status: string | null): ReportUrgency {
  if (status === 'submitted') return 'none';

  const inspectionDate = new Date(dateIso).getTime();
  if (Number.isNaN(inspectionDate)) return 'none';

  const daysSince = (Date.now() - inspectionDate) / (1000 * 60 * 60 * 24);
  if (daysSince >= OVERDUE_DAYS) return 'overdue';
  if (daysSince >= DUE_SOON_DAYS) return 'due-soon';
  return 'none';
}
