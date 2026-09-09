import AsyncStorage from '@react-native-async-storage/async-storage';
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
