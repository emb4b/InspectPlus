import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '../../core/config/env';

export interface UrgencyThresholds {
  dueSoonDays: number;
  overdueDays: number;
}

const STORAGE_KEY = 'inspectplus.config.urgency';

// Null until a validated pair arrives from the cache or app_config; until
// then getUrgencyConfig resolves the build-time ENV defaults.
let snapshot: UrgencyThresholds | null = null;

// These values are operator-editable, so they are untrusted input. Rule 4 is
// the one that matters most: an inverted or equal pair makes the 'due-soon'
// branch of getReportUrgency unreachable, so a report would jump straight to
// 'Overdue' with no warning state.
export function isValidThresholds(value: UrgencyThresholds): boolean {
  const { dueSoonDays, overdueDays } = value;
  return (
    Number.isInteger(dueSoonDays) &&
    dueSoonDays > 0 &&
    Number.isInteger(overdueDays) &&
    overdueDays > 0 &&
    overdueDays > dueSoonDays
  );
}

// Synchronous by contract — getReportUrgency calls this during render, once
// per report row, so it can never await.
export function getUrgencyConfig(): UrgencyThresholds {
  return snapshot ?? { dueSoonDays: ENV.dueSoonDays, overdueDays: ENV.overdueDays };
}

function parseStored(raw: string | null): UrgencyThresholds | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const v = parsed as Record<string, unknown>;
    if (typeof v.dueSoonDays !== 'number' || typeof v.overdueDays !== 'number') return null;

    const candidate: UrgencyThresholds = {
      dueSoonDays: v.dueSoonDays,
      overdueDays: v.overdueDays,
    };
    return isValidThresholds(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

// Called once at startup, before the first report list renders, so a cold
// start offline still uses the last known operator values rather than
// briefly showing the ENV defaults and then flipping.
export async function hydrateUrgencyConfig(): Promise<void> {
  try {
    const stored = parseStored(await AsyncStorage.getItem(STORAGE_KEY));
    if (stored) snapshot = stored;
  } catch {
    // A storage read failure leaves the ENV defaults in place — never fatal.
  }
}

const DUE_SOON_KEY = 'due_soon_days';
const OVERDUE_KEY = 'overdue_days';

interface ConfigRow {
  key: string;
  value: string;
}

// Falls back to `fallback` only when the response omits the key entirely. A
// key that is present but unparseable must reach isValidThresholds as NaN
// (Number.isInteger(NaN) is false) so the whole pair is discarded, rather
// than silently reverting just that key while adopting the other.
function numberFromRows(rows: ConfigRow[], key: string, fallback: number): number {
  const row = rows.find(r => r.key === key);
  if (!row) return fallback;

  return Number(row.value);
}

// Reads the operator-controlled thresholds out of app_config. Fails open in
// every direction — a network error, a missing table, an RLS denial or a
// nonsensical pair all leave the last known values in effect. It must never
// reject: runManagedSync awaits it, and a config read has no business
// failing a sync.
export async function refreshUrgencyConfig(supabase: SupabaseClient): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', [DUE_SOON_KEY, OVERDUE_KEY]);

    if (error || !data) return;

    const rows = data as ConfigRow[];
    const current = getUrgencyConfig();
    const candidate: UrgencyThresholds = {
      dueSoonDays: numberFromRows(rows, DUE_SOON_KEY, current.dueSoonDays),
      overdueDays: numberFromRows(rows, OVERDUE_KEY, current.overdueDays),
    };

    if (!isValidThresholds(candidate)) return;

    snapshot = candidate;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
  } catch {
    // Fail open — same stance as assertAppVersionSupported.
  }
}
