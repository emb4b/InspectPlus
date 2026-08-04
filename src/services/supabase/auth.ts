import * as SecureStore from 'expo-secure-store';
import { supabase } from './client';
import { checkOnline } from '../../utils/network';
import { hashString } from '../../utils/crypto';

// ── Storage keys ──────────────────────────────────────────
const SESSION_KEY       = 'inspectplus.session';
const SESSION_TS_KEY    = 'inspectplus.session.ts';
const CRED_HASH_KEY     = 'inspectplus.cred.hash';
const CRED_EMAIL_KEY    = 'inspectplus.cred.email';
const CRED_USERNAME_KEY = 'inspectplus.cred.username';
const CRED_FULLNAME_KEY = 'inspectplus.cred.fullname';
const CRED_TS_KEY       = 'inspectplus.cred.ts';

// ── Timeouts ──────────────────────────────────────────────
const SHORT_CACHE_MS    = 30 * 60 * 1000;
const CREDENTIAL_WINDOW = 24 * 60 * 60 * 1000;

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

async function resolveEmailOffline(emailOrUsername: string): Promise<string> {
  if (emailOrUsername.includes('@')) return emailOrUsername;
  const storedUsername = await SecureStore.getItemAsync(CRED_USERNAME_KEY);
  const storedEmail    = await SecureStore.getItemAsync(CRED_EMAIL_KEY);
  if (storedUsername !== emailOrUsername || !storedEmail) {
    throw new Error(
      'Username not recognized for offline access. ' +
      'Please connect to the internet to log in.',
    );
  }
  return storedEmail;
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

  const now      = Date.now().toString();
  const credHash = await buildCredentialHash(email, password);

  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEY,       JSON.stringify(data.session)),
    SecureStore.setItemAsync(SESSION_TS_KEY,    now),
    SecureStore.setItemAsync(CRED_HASH_KEY,     credHash),
    SecureStore.setItemAsync(CRED_EMAIL_KEY,    email),
    SecureStore.setItemAsync(CRED_USERNAME_KEY, resolvedUsername),
    SecureStore.setItemAsync(CRED_FULLNAME_KEY, resolvedFullName),
    SecureStore.setItemAsync(CRED_TS_KEY,       now),
  ]);

  console.log('[Auth] Online sign-in success. Credentials cached at', now,
    '| email:', email, '| username:', resolvedUsername);

  return { ...data, fullName: resolvedFullName };
}

async function signInOffline(
  emailOrUsername: string,
  password: string,
) {
  const credTs = await SecureStore.getItemAsync(CRED_TS_KEY);
  console.log('[Auth] Offline attempt — CRED_TS_KEY found:', credTs);
  if (!credTs) {
    throw new Error(
      'No offline credentials stored. ' +
      'Please connect to the internet to log in.',
    );
  }
  if (Date.now() - parseInt(credTs) >= CREDENTIAL_WINDOW) {
    throw new Error(
      'Offline access has expired. ' +
      'Please connect to the internet to log in.',
    );
  }

  const email      = await resolveEmailOffline(emailOrUsername);
  const storedHash = await SecureStore.getItemAsync(CRED_HASH_KEY);
  const inputHash  = await buildCredentialHash(email, password);
  if (inputHash !== storedHash) throw new Error('Invalid credentials.');

  const sessionRaw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!sessionRaw) {
    throw new Error(
      'Session not found. ' +
      'Please connect to the internet to log in.',
    );
  }

  // Refresh the short-cache timestamp so a successful manual offline
  // re-entry also grants a fresh 30-minute auto-login window.
  await SecureStore.setItemAsync(SESSION_TS_KEY, Date.now().toString());

  const fullName = (await SecureStore.getItemAsync(CRED_FULLNAME_KEY)) ?? '';

  return { session: JSON.parse(sessionRaw), user: null, fullName };
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

  async hasActiveCredentialWindow(): Promise<boolean> {
    try {
      const ts = await SecureStore.getItemAsync(CRED_TS_KEY);
      if (!ts) return false;
      return Date.now() - parseInt(ts) < CREDENTIAL_WINDOW;
    } catch {
      return false;
    }
  },

  async signOut() {
    // IMPORTANT: we deliberately do NOT delete SESSION_KEY or any of the
    // CRED_* keys here. Those are what allow an inspector to log back in
    // OFFLINE for the rest of that 24-hour window after logging in online
    // just once. Wiping them on every logout would defeat that entirely.
    //
    // We only delete SESSION_TS_KEY — this is the marker that lets the
    // app silently auto-restore a session within 30 minutes with no
    // password at all. Removing it means logout actually requires the
    // password to be re-entered next time, even though that re-entry
    // can still succeed fully offline via the preserved CRED_* keys.
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
