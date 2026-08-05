import * as SecureStore from 'expo-secure-store';
import { supabase } from './client';
import { checkOnline } from '../../utils/network';
import { hashString } from '../../utils/crypto';
import { ENV } from '../../core/config/env';

// ── Storage keys ──────────────────────────────────────────
const SESSION_KEY       = 'inspectplus.session';
const SESSION_TS_KEY    = 'inspectplus.session.ts';
const CRED_FULLNAME_KEY = 'inspectplus.cred.fullname';
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

// ── Types ───────────────────────────────────────────────────
interface CachedCredential {
  email: string;
  username: string;
  fullName: string;
  credHash: string;
  // This user's own Supabase session, so offline sign-in can restore the
  // right one even when they're not the last person who used the device.
  session: object;
  // When this credential was last refreshed by a successful online
  // sign-in — the 1-week offline window is measured from here, per user.
  ts: number;
}

// ── Auth-specific helpers (not reusable outside auth) ─────
function buildCredentialHash(email: string, password: string) {
  return hashString(`${email}:${password}:inspectplus`);
}

async function resolveEmail(emailOrUsername: string): Promise<string> {
  if (emailOrUsername.includes('@')) return emailOrUsername;
  const { data, error } = await supabase
    .rpc('get_email_by_username', { p_username: emailOrUsername });
  if (error || !data) throw new Error('Username not found.');
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

// Adds this inspector's credential to the device's offline store, or
// refreshes it (new hash, session, and 1-week window) if they were already
// cached from a previous online sign-in — every other cached inspector on
// this device keeps their own entry untouched.
async function upsertCachedUser(entry: CachedCredential): Promise<void> {
  const users = await readCachedUsers();
  const next = users.filter(
    u => u.email.toLowerCase() !== entry.email.toLowerCase(),
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
  if (data.user) {
    const { data: profile, error: profileError } = await supabase
      .from('user_accounts')
      .select('username, first_name, middle_name, last_name')
      .eq('uid', data.user.id)
      .single();
    if (profileError) {
      console.log('[Auth] Could not resolve username for offline cache:', profileError.message);
    } else {
      resolvedUsername = profile?.username ?? '';
      resolvedFullName = [profile?.first_name, profile?.middle_name, profile?.last_name]
        .filter(Boolean)
        .join(' ');
    }
  }

  const now      = Date.now();
  const credHash = await buildCredentialHash(email, password);

  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEY,       JSON.stringify(data.session)),
    SecureStore.setItemAsync(SESSION_TS_KEY,    now.toString()),
    SecureStore.setItemAsync(CRED_FULLNAME_KEY, resolvedFullName),
    upsertCachedUser({
      email,
      username: resolvedUsername,
      fullName: resolvedFullName,
      credHash,
      session: data.session as object,
      ts: now,
    }),
  ]);

  console.log('[Auth] Online sign-in success. Credentials cached at', now,
    '| email:', email, '| username:', resolvedUsername);

  return { ...data, fullName: resolvedFullName };
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

  if (Date.now() - match.ts >= CREDENTIAL_WINDOW) {
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

  // This inspector becomes the device's active session — the short-cache
  // auto-restore and the cached display name both follow whoever most
  // recently signed in, online or off.
  const now = Date.now().toString();
  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEY,       JSON.stringify(match.session)),
    SecureStore.setItemAsync(SESSION_TS_KEY,    now),
    SecureStore.setItemAsync(CRED_FULLNAME_KEY, match.fullName),
  ]);

  return { session: match.session, user: null, fullName: match.fullName };
}

// ── Public API ────────────────────────────────────────────
export const authService = {
  async signIn(emailOrUsername: string, password: string) {
    const online = await checkOnline();
    return online
      ? signInOnline(emailOrUsername, password)
      : signInOffline(emailOrUsername, password);
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

  // True if ANY inspector cached on this device still has an active 1-week
  // offline window — not tied to whoever is currently signed in.
  async hasActiveCredentialWindow(): Promise<boolean> {
    try {
      const users = await readCachedUsers();
      return users.some(u => Date.now() - u.ts < CREDENTIAL_WINDOW);
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
