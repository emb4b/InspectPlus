// Development environment — values come from .env file
// No hardcoded secrets here
export const envConfig = {
  enableDebugLogs: true,
  shortCacheMs: 30 * 60 * 1000,           // 30 minutes
  credentialWindowMs: 7 * 24 * 60 * 60 * 1000, // 1 week
  syncIntervalMs: 30 * 1000,               // 30 seconds
  // How long a draft report may sit after its inspection date before the UI
  // flags it. Days, not ms — these are read by getReportUrgency.
  dueSoonDays: 14,
  overdueDays: 30,
};