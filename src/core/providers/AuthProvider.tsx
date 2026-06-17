import React, {
  createContext, useContext,
  useEffect, useState, useCallback,
} from 'react';
import { authService } from '../../services/supabase/auth';
import { supabase } from '../../services/supabase/client';

interface AuthContextValue {
  session: object | null;
  loading: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        // Online: try live Supabase session
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          setLoading(false);
          return;
        }
      } catch {
        // Offline — fall through
      }

      // Tier 1: auto-login if within 30 minutes
      const shortCache = await authService.getShortCacheSession();
      if (shortCache) {
        setSession(shortCache);
        setLoading(false);
        return;
      }

      // No auto-login — show login screen
      // Tier 2 is handled by the login button itself
      setSession(null);
      setLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoading(false);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Called from the login screen. Handles BOTH paths:
  //  - Online: supabase.auth.signInWithPassword() also triggers
  //    onAuthStateChange above, which sets session again — harmless,
  //    just two writes of the same value.
  //  - Offline: nothing else updates session, since signInOffline()
  //    never calls a real Supabase auth method. This is the ONLY
  //    place that propagates the offline-restored session into the app.
  const signIn = useCallback(
    async (emailOrUsername: string, password: string) => {
      const result = await authService.signIn(emailOrUsername, password);
      if (result?.session) {
        setSession(result.session);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};