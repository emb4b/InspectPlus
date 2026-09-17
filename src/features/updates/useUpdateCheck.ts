import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AvailableUpdate, checkForUpdate } from './checkForUpdate';

export const UPDATE_CHECK_STORAGE_KEY = 'inspectplus.updateCheck';
export const UPDATE_DISMISSED_STORAGE_KEY = 'inspectplus.updateDismissed';
// Once per launch would hit GitHub every time an inspector reopens the app
// in the field; six hours keeps it to a handful of requests a day while a
// known update still shows on every launch from the cache.
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

interface CachedCheck {
  checkedAt: number;
  update: AvailableUpdate | null;
}

const readCache = async (): Promise<CachedCheck | null> => {
  try {
    const raw = await AsyncStorage.getItem(UPDATE_CHECK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedCheck>;
    return typeof parsed.checkedAt === 'number' ? { checkedAt: parsed.checkedAt, update: parsed.update ?? null } : null;
  } catch {
    return null;
  }
};

// Storage failures are swallowed on both reads and writes: the worst case
// is one extra GitHub call or a banner reappearing after dismissal, neither
// of which is worth an error in front of the user.
const writeQuietly = async (key: string, value: string) => {
  try { await AsyncStorage.setItem(key, value); } catch { /* see above */ }
};

// Resolves whether a newer APK is published, for the Home banner. Throttled
// through AsyncStorage rather than module state so the interval survives
// app restarts, and a dismissed version stays dismissed until a later one
// appears.
export function useUpdateCheck(): { update: AvailableUpdate | null; dismiss: () => Promise<void> } {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readCache();
      let latest: AvailableUpdate | null;
      if (cached && Date.now() - cached.checkedAt < UPDATE_CHECK_INTERVAL_MS) {
        latest = cached.update;
      } else {
        latest = await checkForUpdate();
        await writeQuietly(UPDATE_CHECK_STORAGE_KEY, JSON.stringify({ checkedAt: Date.now(), update: latest }));
      }
      if (cancelled || !latest) return;
      let dismissed: string | null = null;
      try { dismissed = await AsyncStorage.getItem(UPDATE_DISMISSED_STORAGE_KEY); } catch { /* treated as not dismissed */ }
      if (!cancelled && dismissed !== latest.version) setUpdate(latest);
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = useCallback(async () => {
    if (!update) return;
    setUpdate(null);
    await writeQuietly(UPDATE_DISMISSED_STORAGE_KEY, update.version);
  }, [update]);

  return { update, dismiss };
}
