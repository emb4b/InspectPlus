import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '@/src/core/config/env';

// ── Temporary debug — remove before production ────────────────────────────────
console.log('[Supabase] URL:', ENV.supabaseUrl);
console.log('[Supabase] Key prefix:', ENV.supabaseAnonKey?.slice(0, 20));
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_FETCH_TIMEOUT_MS = 5000;

// GoTrueClient only serializes calls via its internal lock when the
// Navigator LockManager API is available (browsers) — React Native has no
// such API, so it silently falls back to a true no-op lock there (see
// auth-js's GoTrueClient constructor: `isBrowser() && navigator?.locks`).
// There is no lock contention to bound on this platform.
//
// The actual cause of a slow signOut()/getSession()/signInWithPassword():
// each makes a real network request (scope: 'local' only changes what the
// *server* invalidates, it doesn't skip the request), and signOut() also
// first awaits the client's own initial session/token-refresh check. None
// of that has a timeout of ours attached, so on a slow-but-not-fully-dead
// connection it's bounded only by the OS's own default socket timeout,
// which can easily run into the tens of seconds.
//
// `auth` doesn't accept a `fetch` option in this client's public types —
// a custom fetch can only be set via the top-level `global.fetch`, which
// covers every Supabase sub-client (auth, postgrest, storage), not just
// auth. The sync service's pull/push calls may legitimately need more than
// a few seconds for larger payloads, so this only applies the timeout to
// requests actually hitting the `/auth/v1/` endpoint, leaving everything
// else unbounded.
function fetchWithAuthTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (!url.includes('/auth/v1/')) return fetch(input, init);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export const supabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithAuthTimeout,
  },
});