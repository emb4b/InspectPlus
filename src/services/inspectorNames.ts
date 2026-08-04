import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase/client';
import { checkOnline } from '../utils/network';

const CACHE_KEY = 'inspectplus.inspectorNames';
// Names rarely change — safe to reuse a cached value for a day before
// re-resolving, so switching between reports/establishments while offline
// still shows a name instead of a raw uid.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  fullName: string;
  cachedAt: number;
}
type Cache = Record<string, CacheEntry>;

async function readCache(): Promise<Cache> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeCache(cache: Cache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Best-effort cache — a write failure just means we re-resolve next time.
  }
}

// Resolves uid -> "First Middle Last" for ANY inspector, not just the
// signed-in user, via the get_inspector_names RPC (SECURITY DEFINER —
// bypasses user_accounts' self-only RLS, but only ever returns name
// fields for the requested uids). Falls back to a cached value while
// offline or on RPC failure, and to null when nothing is known yet.
export async function resolveInspectorNames(uids: string[]): Promise<Record<string, string | null>> {
  const unique = Array.from(new Set(uids.filter(Boolean)));
  if (unique.length === 0) return {};

  const cache = await readCache();
  const now = Date.now();

  const result: Record<string, string | null> = {};
  const stale: string[] = [];
  for (const uid of unique) {
    const entry = cache[uid];
    if (entry) result[uid] = entry.fullName;
    if (!entry || now - entry.cachedAt >= CACHE_TTL_MS) stale.push(uid);
  }

  if (stale.length === 0) return result;

  const online = await checkOnline();
  if (!online) {
    for (const uid of stale) if (!(uid in result)) result[uid] = null;
    return result;
  }

  try {
    const { data, error } = await supabase.rpc('get_inspector_names', { p_uids: stale });
    if (error) throw error;
    const rows = (data ?? []) as { uid: string; full_name: string | null }[];
    const nextCache = { ...cache };
    for (const row of rows) {
      if (row.full_name) {
        result[row.uid] = row.full_name;
        nextCache[row.uid] = { fullName: row.full_name, cachedAt: now };
      }
    }
    for (const uid of stale) if (!(uid in result)) result[uid] = null;
    await writeCache(nextCache);
  } catch (err) {
    console.error('[inspectorNames] Failed to resolve names:', err);
    for (const uid of stale) if (!(uid in result)) result[uid] = null;
  }

  return result;
}
