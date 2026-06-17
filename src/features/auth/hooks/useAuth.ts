import { useState } from 'react';
import { router } from 'expo-router';
import { useAuthContext } from '../../../core/providers/AuthProvider';

interface LoginCredentials {
  username: string;
  password: string;
}

interface UseAuthReturn {
  login: (credentials: LoginCredentials, asAdmin?: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const { signIn } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (
    credentials: LoginCredentials,
    asAdmin = false,
  ): Promise<void> => {
    const { username, password } = credentials;

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // "asAdmin" is currently unused — both buttons behave identically
      // for now (per decision: treat both the same, design the real
      // distinction later).
      //
      // TODO: once role-based login is decided, validate role here
      // after signIn() resolves — e.g. read the signed-in user's role
      // and, if asAdmin is true but role !== 'administrator', call
      // signOut() and throw an error instead of proceeding.
      await signIn(username, password);

      router.replace('/home');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { login, isLoading, error, clearError };
};
