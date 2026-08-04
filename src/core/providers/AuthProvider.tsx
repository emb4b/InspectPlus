import React, {
  createContext, useContext,
  useEffect, useState, useCallback, useRef,
} from 'react';
import { authService } from '../../services/supabase/auth';
import { supabase } from '../../services/supabase/client';
import { checkOnline } from '../../utils/network';

// If neither the local short-cache nor Supabase's own session check has
// resolved within this window, stop waiting and show the login screen.
// This only ever touches our own `loading` flag via a plain setTimeout —
// it must NOT call any supabase.auth.* method itself. Those methods share
// an internal lock with signOut()/signInWithPassword(), so an abandoned
// call left running in the background (e.g. one we gave up waiting on)
// would block a LATER logout/login for as long as its own network request
// takes to finally resolve. That's what happened when this used to wrap
// an explicit getSession() call in a timeout instead.
const BOOT_TIMEOUT_MS = 3000;

interface AuthContextValue {
  session: object | null;
  // Cached "First Middle Last" of the signed-in inspector, resolved from
  // user_accounts at sign-in and cached alongside the other CRED_* keys so
  // it survives offline re-entry — session.user only carries email/id.
  fullName: string | null;
  loading: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  fullName: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<object | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Tracks authService.signOut()'s background network cleanup (see signOut
  // below). React Native gets a no-op lock from supabase-js (see client.ts),
  // so nothing there stops a signIn() from starting while an old signOut()
  // is still in flight. If that happens, the stale signOut's eventual
  // _removeSession() call wipes whatever session is CURRENTLY stored —
  // including the brand-new one — and broadcasts SIGNED_OUT, which looks
  // like a spontaneous logout. signIn() awaits this ref first so any
  // pending signOut fully finishes (its own SIGNED_OUT event included)
  // before a new session ever gets created.
  const pendingSignOutRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let settled = false;

    function settleOnce(next: object | null) {
      if (settled) return;
      settled = true;
      setSession(next);
      setLoading(false);
    }

    // Tier 1 fast path: local-only, never touches the Supabase auth client,
    // so it can't contend for its internal lock. Auto-login within 30 min.
    authService.getShortCacheSession().then(shortCache => {
      if (shortCache) settleOnce(shortCache);
    });

    // Cached full name persists across restarts independently of the
    // session-restore race above — load it whenever it's there.
    authService.getCachedFullName().then(name => {
      if (name) setFullName(name);
    });

    // onAuthStateChange fires once immediately with the client's own
    // current session (an INITIAL_SESSION event — the passive equivalent
    // of calling getSession() ourselves) and again on every later
    // sign-in/out/refresh. This is deliberately the ONLY way we read the
    // live Supabase session — see the BOOT_TIMEOUT_MS comment above for why
    // we don't call getSession() explicitly. The listener's answer always
    // wins once it arrives, even if the boot timeout below already showed
    // the login screen — that's a legitimate (if late) online session,
    // not a bug.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        settled = true;
        setSession(newSession);
        setLoading(false);
      },
    );

    // Don't let a cold/dead network hold the boot spinner forever.
    const timer = setTimeout(() => settleOnce(null), BOOT_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  // Self-healing backfill: a session restored via the short-cache path (or
  // one whose credential cache predates fullName ever being stored) can
  // reach here with a real session but no cached name — that's what showed
  // up as a bare "You" instead of an actual name on the establishment/report
  // screens. Only signInOnline() normally resolves+caches fullName, so a
  // session that never went through it needs this fallback to ever get one.
  useEffect(() => {
    if (loading || !session || fullName) return;
    const uid = (session as { user?: { id?: string } }).user?.id;
    if (!uid) return;

    let cancelled = false;
    (async () => {
      if (!(await checkOnline())) return;
      const { data, error } = await supabase
        .from('user_accounts')
        .select('first_name, middle_name, last_name')
        .eq('uid', uid)
        .single();
      if (cancelled || error || !data) return;
      const resolved = [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ');
      if (resolved) {
        setFullName(resolved);
        await authService.cacheFullName(resolved);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, session, fullName]);

  // Called from the login screen. Handles BOTH paths:
  //  - Online: supabase.auth.signInWithPassword() also triggers
  //    onAuthStateChange above, which sets session again — harmless,
  //    just two writes of the same value.
  //  - Offline: nothing else updates session, since signInOffline()
  //    never calls a real Supabase auth method. This is the ONLY
  //    place that propagates the offline-restored session into the app.
  const signIn = useCallback(
    async (emailOrUsername: string, password: string) => {
      // Let any still-running signOut() cleanup finish first — see
      // pendingSignOutRef above for why this matters.
      if (pendingSignOutRef.current) {
        await pendingSignOutRef.current.catch(() => {});
      }

      const result = await authService.signIn(emailOrUsername, password);
      if (result?.session) {
        setSession(result.session);
      }
      if (result?.fullName) {
        setFullName(result.fullName);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    // authService.signOut() hits Supabase's /auth/v1/logout endpoint over
    // the network (bounded by AUTH_FETCH_TIMEOUT_MS — see client.ts), which
    // is a dead end while offline. Clear local session first so
    // RootNavigator's redirect fires immediately instead of waiting on that
    // round trip (or its timeout) to resolve.
    setSession(null);
    const cleanup = authService.signOut();
    pendingSignOutRef.current = cleanup;
    try {
      await cleanup;
    } finally {
      if (pendingSignOutRef.current === cleanup) {
        pendingSignOutRef.current = null;
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, fullName, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};