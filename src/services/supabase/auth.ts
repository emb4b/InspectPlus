import * as SecureStore from 'expo-secure-store';
import { Session, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from './client';
import { checkOnline } from '../../utils/network';
import { hashString } from '../../utils/crypto';
import { ENV } from '../../core/config/env';

// ── Storage keys ──────────────────────────────────────────
const SESSION_KEY       = 'inspectplus.session';
const SESSION_TS_KEY    = 'inspectplus.session.ts';
const CRED_FULLNAME_KEY = 'inspectplus.cred.fullname';
// The signed-in inspector's jurisdiction, cached the same way as fullName —
// resolved from user_accounts.province at sign-in, needed offline to gate
// which establishments/reports render (see AuthProvider).
const CRED_PROVINCE_KEY = 'inspectplus.cred.province';
// The specific municipalities within that province the inspector is
// assigned to (public.inspector_municipalities — many rows per inspector),
// cached as a JSON string array. Used only to populate the municipality
// filter in the establishments/reports list screens — NOT an access-control
// boundary, jurisdiction visibility stays province-wide (see the
// 2026-08-06 migration).
const CRED_MUNICIPALITIES_KEY = 'inspectplus.cred.municipalities';
// The signed-in user's role ('Inspector' | 'Administrator' | 'Developer'),
// cached the same way as province. Administrator/Developer bypass province
// scoping entirely (see the establishments/inspection_reports RLS policies
// added alongside this) — cached here so that also holds true offline.
const CRED_ROLE_KEY     = 'inspectplus.cred.role';
// Every inspector who has signed in online on this device, keyed by email,
// each with their own password hash + session so any of them (not just
// whoever logged in most recently) can sign back in offline. See
// CachedCredential below.
const CRED_USERS_KEY    = 'inspectplus.cred.users';

// ── Timeouts ──────────────────────────────────────────────
// Sourced from ENV (per-environment default, overridable via .env) so these
// can be tuned without a code change — see src/core/config/env.ts.
const SHORT_CACHE_MS    = ENV.shortCacheMs;
const CREDENTIAL_WINDOW = ENV.credentialWindowMs;
// Bounds the username-resolution RPC and the post-login profile/municipality
// lookups below — none of these hit fetchWithAuthTimeout's /auth/v1/-only
// timeout (see client.ts), so without this a slow/dead backend can stall
// login for tens of seconds even while the device itself is online.
const PROFILE_QUERY_TIMEOUT_MS = 5000;
// Caps how long offline sign-in will wait on restoring the live Supabase
// client's session (see signInOffline) before proceeding without it. Kept
// separate from PROFILE_QUERY_TIMEOUT_MS because it doesn't abort the
// underlying request — GoTrueClient's own refresh-retry loop keeps running
// in the background regardless — it only bounds how long we block on it.
const SESSION_RESTORE_WAIT_MS = 5000;

// ── Types ───────────────────────────────────────────────────
interface CachedCredential {
  email: string;
  username: string;
  fullName: string;
  province: string;
  municipalities: string[];
  role: string;
  credHash: string;
  // This user's own Supabase session, so offline sign-in can restore the
  // right one even when they're not the last person who used the device.
  session: Session;
  // When this credential was last refreshed by a successful online
  // sign-in — the 1-week offline window is measured from here, per user.
  ts: number;
}

// ── Auth-specific helpers (not reusable outside auth) ─────
function buildCredentialHash(email: string, password: string) {
  return hashString(`${email}:${password}:inspectplus`);
}

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// Thrown when an online sign-in step fails because the backend couldn't be
// reached (dead server, DNS failure, timed-out request) rather than because
// the credentials are actually invalid. authService.signIn catches this
// (alongside supabase-js's own AuthRetryableFetchError) to fall back to this
// device's cached offline credentials instead of surfacing a misleading
// error to the user.
class AuthConnectivityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConnectivityError';
  }
}

function isConnectivityError(err: unknown): boolean {
  return err instanceof AuthConnectivityError || isAuthRetryableFetchError(err);
}

async function resolveEmail(emailOrUsername: string): Promise<string> {
  if (emailOrUsername.includes('@')) return emailOrUsername;
  const { data, error } = await supabase
    .rpc('get_email_by_username', { p_username: emailOrUsername })
    .abortSignal(timeoutSignal(PROFILE_QUERY_TIMEOUT_MS));
  // `error` here means the RPC request itself failed (network/timeout/server
  // error) — it does NOT mean the username doesn't exist; that's `!data`
  // with no error. Conflating the two used to surface a dead backend as
  // "Username not found.", and the offline-credential fallback never got a
  // chance to run because this threw a generic Error instead of a
  // connectivity one.
  if (error) {
    throw new AuthConnectivityError(
      `Could not verify username — request failed: ${error.message}`,
    );
  }
  if (!data) throw new Error('Username not found.');
  return data as string;
}

// ── Per-device, multi-user offline credential store ────────
async function readCachedUsers(): Promise<CachedCredential[]> {
  try {
    const raw = await SecureStore.getItemAsync(CRED_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCachedUsers(users: CachedCredential[]): Promise<void> {
  await SecureStore.setItemAsync(CRED_USERS_KEY, JSON.stringify(users));
}

function isCredentialExpired(user: CachedCredential): boolean {
  return Date.now() - user.ts >= CREDENTIAL_WINDOW;
}

// Adds this inspector's credential to the device's offline store, or
// refreshes it (new hash, session, and 1-week window) if they were already
// cached from a previous online sign-in — every other cached inspector on
// this device keeps their own entry untouched. Also sweeps out any OTHER
// cached inspector whose 1-week window has already lapsed: a successful
// online sign-in is a convenient, frequent point to free that storage
// rather than leaving expired sessions/password hashes sitting on the
// device indefinitely until someone happens to try them offline (see
// isCredentialExpired's other call site in signInOffline).
async function upsertCachedUser(entry: CachedCredential): Promise<void> {
  const users = await readCachedUsers();
  const next = users.filter(
    u => u.email.toLowerCase() !== entry.email.toLowerCase() && !isCredentialExpired(u),
  );
  next.push(entry);
  await writeCachedUsers(next);
}

function findCachedUser(
  users: CachedCredential[],
  emailOrUsername: string,
): CachedCredential | undefined {
  const needle = emailOrUsername.toLowerCase();
  return emailOrUsername.includes('@')
    ? users.find(u => u.email.toLowerCase() === needle)
    : users.find(u => u.username.toLowerCase() === needle);
}

// ── Sign-in flows ─────────────────────────────────────────
async function signInOnline(
  emailOrUsername: string,
  password: string,
) {
  const email = await resolveEmail(emailOrUsername);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  let resolvedUsername = '';
  let resolvedFullName = '';
  let resolvedProvince = '';
  let resolvedMunicipalities: string[] = [];
  let resolvedRole = '';
  if (data.user) {
    // Independent queries keyed off the same uid — run them together and
    // bound each with its own timeout, instead of two sequential unbounded
    // requests stacking on top of the login critical path.
    const [profileResult, municipalityResult] = await Promise.all([
      supabase
        .from('user_accounts')
        .select('username, first_name, middle_name, last_name, province, role')
        .eq('uid', data.user.id)
        .abortSignal(timeoutSignal(PROFILE_QUERY_TIMEOUT_MS))
        .single(),
      supabase
        .from('inspector_municipalities')
        .select('municipality')
        .eq('inspector_uid', data.user.id)
        .abortSignal(timeoutSignal(PROFILE_QUERY_TIMEOUT_MS)),
    ]);

    const { data: profile, error: profileError } = profileResult;
    if (profileError) {
      console.log('[Auth] Could not resolve username for offline cache:', profileError.message);
    } else {
      resolvedUsername = profile?.username ?? '';
      resolvedFullName = [profile?.first_name, profile?.middle_name, profile?.last_name]
        .filter(Boolean)
        .join(' ');
      resolvedProvince = profile?.province ?? '';
      resolvedRole = profile?.role ?? '';
    }

    const { data: municipalityRows, error: municipalityError } = municipalityResult;
    if (municipalityError) {
      console.log('[Auth] Could not resolve municipality assignments for offline cache:', municipalityError.message);
    } else {
      resolvedMunicipalities = (municipalityRows ?? []).map(r => r.municipality).sort();
    }
  }

  const now      = Date.now();
  const credHash = await buildCredentialHash(email, password);

  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEY,       JSON.stringify(data.session)),
    SecureStore.setItemAsync(SESSION_TS_KEY,    now.toString()),
    SecureStore.setItemAsync(CRED_FULLNAME_KEY, resolvedFullName),
    SecureStore.setItemAsync(CRED_PROVINCE_KEY, resolvedProvince),
    SecureStore.setItemAsync(CRED_MUNICIPALITIES_KEY, JSON.stringify(resolvedMunicipalities)),
    SecureStore.setItemAsync(CRED_ROLE_KEY,     resolvedRole),
    upsertCachedUser({
      email,
      username: resolvedUsername,
      fullName: resolvedFullName,
      province: resolvedProvince,
      municipalities: resolvedMunicipalities,
      role: resolvedRole,
      credHash,
      session: data.session as Session,
      ts: now,
    }),
  ]);

  console.log('[Auth] Online sign-in success. Credentials cached at', now,
    '| email:', email, '| username:', resolvedUsername);

  return {
    ...data,
    fullName: resolvedFullName,
    province: resolvedProvince,
    municipalities: resolvedMunicipalities,
    role: resolvedRole,
  };
}

async function signInOffline(
  emailOrUsername: string,
  password: string,
) {
  const users = await readCachedUsers();
  if (users.length === 0) {
    throw new Error(
      'No offline credentials stored. ' +
      'Please connect to the internet to log in.',
    );
  }

  const match = findCachedUser(users, emailOrUsername);
  if (!match) {
    throw new Error(
      'Username not recognized for offline access. ' +
      'Please connect to the internet to log in.',
    );
  }

  if (isCredentialExpired(match)) {
    // The 1-week offline window is a hard cutoff, not just a login gate —
    // once it lapses, drop this inspector's cached session/refresh tokens
    // and password hash from the device entirely (and sweep any other
    // expired peer found in the same pass) rather than leaving them
    // allocated on the device indefinitely. A fresh online sign-in
    // re-establishes a new window and re-caches everything from scratch.
    await writeCachedUsers(users.filter(u => !isCredentialExpired(u)));
    throw new Error(
      'Offline access has expired. ' +
      'Please connect to the internet to log in.',
    );
  }

  const inputHash = await buildCredentialHash(match.email, password);
  if (inputHash !== match.credHash) throw new Error('Invalid credentials.');

  if (!match.session) {
    throw new Error(
      'Session not found. ' +
      'Please connect to the internet to log in.',
    );
  }

  // Restore this inspector's session into the live Supabase client itself —
  // not just SecureStore/React state. Without this, the client keeps using
  // whichever session it already had (the previous inspector's, or none),
  // so every request made after an offline account switch — sync included —
  // would silently go out under the wrong identity while the UI shows the
  // newly switched-to inspector. That's also why this is awaited (bounded,
  // below) rather than fully fire-and-forget: the post-login sync kicked off
  // right after signIn() resolves needs the live client's session already
  // pointed at the right user.
  //
  // If the cached access_token has expired (likely, given the up-to-a-week
  // offline window), setSession() triggers GoTrueClient's internal
  // refresh-token request — and if that has no server to talk to,
  // GoTrueClient retries it with exponential backoff for up to
  // AUTO_REFRESH_TICK_DURATION_MS (30s in supabase-js) before giving up.
  // Waiting on that unconditionally used to stall offline sign-in for up to
  // ~30s on a dead backend, which defeats the entire point of the offline
  // path. So we only wait up to SESSION_RESTORE_WAIT_MS: on a reachable
  // server this still finishes well within that (a healthy refresh is
  // fast), and on a dead one we stop blocking and let it keep retrying in
  // the background — autoRefreshToken (see client.ts) picks it up again
  // once connectivity actually returns.
  const setSessionPromise = supabase.auth
    .setSession({
      access_token: match.session.access_token,
      refresh_token: match.session.refresh_token,
    })
    .then(({ error: setSessionError }) => {
      if (setSessionError) {
        console.warn('[Auth] Could not restore live session on offline sign-in (will retry once online):', setSessionError.message);
      }
    })
    .catch(err => {
      console.warn('[Auth] Could not restore live session on offline sign-in (will retry once online):', err instanceof Error ? err.message : err);
    });

  const timedOut = await Promise.race([
    setSessionPromise.then(() => false),
    new Promise<true>(resolve => setTimeout(() => resolve(true), SESSION_RESTORE_WAIT_MS)),
  ]);
  if (timedOut) {
    console.warn(
      `[Auth] Live session restore did not finish within ${SESSION_RESTORE_WAIT_MS}ms ` +
      '(backend likely unreachable) — continuing offline sign-in without waiting further; ' +
      'it keeps retrying in the background.',
    );
  }

  // This inspector becomes the device's active session — the short-cache
  // auto-restore and the cached display name both follow whoever most
  // recently signed in, online or off.
  const now = Date.now().toString();
  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEY,       JSON.stringify(match.session)),
    SecureStore.setItemAsync(SESSION_TS_KEY,    now),
    SecureStore.setItemAsync(CRED_FULLNAME_KEY, match.fullName),
    SecureStore.setItemAsync(CRED_PROVINCE_KEY, match.province ?? ''),
    SecureStore.setItemAsync(CRED_MUNICIPALITIES_KEY, JSON.stringify(match.municipalities ?? [])),
    SecureStore.setItemAsync(CRED_ROLE_KEY,     match.role ?? ''),
  ]);

  return {
    session: match.session,
    user: null,
    fullName: match.fullName,
    province: match.province ?? '',
    municipalities: match.municipalities ?? [],
    role: match.role ?? '',
  };
}

// ── Public API ────────────────────────────────────────────
export const authService = {
  async signIn(emailOrUsername: string, password: string) {
    const online = await checkOnline();
    if (!online) return signInOffline(emailOrUsername, password);

    try {
      return await signInOnline(emailOrUsername, password);
    } catch (err) {
      if (!isConnectivityError(err)) throw err;
      // checkOnline() only sees device-level connectivity (NetInfo) — it
      // can't tell the backend itself is down until we actually try it. Fall
      // back to this device's cached offline credentials, if any, rather
      // than surfacing the network failure as a misleading "not found" or
      // auth error to a user who has already signed in here before.
      console.log(
        '[Auth] Online sign-in failed due to connectivity, falling back to offline credentials:',
        (err as Error).message,
      );
      return signInOffline(emailOrUsername, password);
    }
  },

  async getShortCacheSession() {
    try {
      const [raw, ts] = await Promise.all([
        SecureStore.getItemAsync(SESSION_KEY),
        SecureStore.getItemAsync(SESSION_TS_KEY),
      ]);
      if (!raw || !ts) return null;
      if (Date.now() - parseInt(ts) >= SHORT_CACHE_MS) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async getCachedFullName(): Promise<string> {
    try {
      return (await SecureStore.getItemAsync(CRED_FULLNAME_KEY)) ?? '';
    } catch {
      return '';
    }
  },

  // Backfills CRED_FULLNAME_KEY for a session that was restored without
  // ever going through signInOnline (e.g. a short-cache auto-restore on a
  // device whose credential cache predates this feature) — see
  // AuthProvider's self-healing effect.
  async cacheFullName(fullName: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(CRED_FULLNAME_KEY, fullName);
    } catch {
      // Best effort — worst case it re-resolves next boot too.
    }
  },

  async getCachedProvince(): Promise<string> {
    try {
      return (await SecureStore.getItemAsync(CRED_PROVINCE_KEY)) ?? '';
    } catch {
      return '';
    }
  },

  // Backfills CRED_PROVINCE_KEY for a session restored without going through
  // signInOnline — same rationale as cacheFullName above.
  async cacheProvince(province: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(CRED_PROVINCE_KEY, province);
    } catch {
      // Best effort — worst case it re-resolves next boot too.
    }
  },

  async getCachedMunicipalities(): Promise<string[]> {
    try {
      const raw = await SecureStore.getItemAsync(CRED_MUNICIPALITIES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  // Backfills CRED_MUNICIPALITIES_KEY — same rationale as cacheFullName above.
  async cacheMunicipalities(municipalities: string[]): Promise<void> {
    try {
      await SecureStore.setItemAsync(CRED_MUNICIPALITIES_KEY, JSON.stringify(municipalities));
    } catch {
      // Best effort — worst case it re-resolves next boot too.
    }
  },

  async getCachedRole(): Promise<string> {
    try {
      return (await SecureStore.getItemAsync(CRED_ROLE_KEY)) ?? '';
    } catch {
      return '';
    }
  },

  // Backfills CRED_ROLE_KEY — same rationale as cacheFullName above.
  async cacheRole(role: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(CRED_ROLE_KEY, role);
    } catch {
      // Best effort — worst case it re-resolves next boot too.
    }
  },

  // True if ANY inspector cached on this device still has an active 1-week
  // offline window — not tied to whoever is currently signed in.
  async hasActiveCredentialWindow(): Promise<boolean> {
    try {
      const users = await readCachedUsers();
      return users.some(u => !isCredentialExpired(u));
    } catch {
      return false;
    }
  },

  async signOut() {
    // IMPORTANT: we deliberately do NOT delete CRED_USERS_KEY (or any one
    // user's entry in it) here. Those are what let ANY inspector who has
    // signed in online on this device log back in OFFLINE for the rest of
    // their own 1-week window — wiping them on every logout would defeat
    // that entirely, for this user and every other cached inspector.
    //
    // We only delete SESSION_TS_KEY — this is the marker that lets the
    // app silently auto-restore a session within 30 minutes with no
    // password at all. Removing it means logout actually requires the
    // password to be re-entered next time, even though that re-entry
    // can still succeed fully offline (for up to a week) via the
    // preserved CRED_USERS_KEY entry for whoever logs back in.
    await SecureStore.deleteItemAsync(SESSION_TS_KEY);

    try {
      // 'local' scope clears Supabase's own persisted session without
      // needing network, so the online auto-restore path doesn't
      // silently bypass the login screen either.
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Best effort — SESSION_TS_KEY above is what actually gates
      // automatic re-entry.
    }
  },
};
