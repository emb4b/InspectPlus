import { AuthRetryableFetchError } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { checkOnline } from '../../utils/network';
import { supabase } from './client';
import { authService } from './auth';

// ── Mocks ───────────────────────────────────────────────────
// Each factory below is self-contained (no references to outer `const`s) —
// babel-plugin-jest-hoist lifts every jest.mock() call above the imports
// at the top of this file, so a factory that closed over an outer variable
// would see it before its initializer ever ran. That hoisting is also why
// the four mocked modules can be imported first and still resolve to these
// factories rather than the real implementations.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});

jest.mock('../../utils/crypto', () => ({
  hashString: jest.fn((input: string) => Promise.resolve(`hash(${input})`)),
}));

jest.mock('../../utils/network', () => ({
  checkOnline: jest.fn(),
}));

jest.mock('./client', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      signInWithPassword: jest.fn(),
      setSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const secureStoreState = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const mockCheckOnline = checkOnline as jest.Mock;
const mockSupabase = supabase as unknown as {
  rpc: jest.Mock;
  auth: { signInWithPassword: jest.Mock; setSession: jest.Mock };
  from: jest.Mock;
};

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: PromiseLike<typeof result> & Record<string, jest.Mock> = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    abortSignal: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve(result)),
    then: ((resolve: (v: typeof result) => void) => Promise.resolve(result).then(resolve)) as never,
  } as never;
  return builder;
}

const CRED_USERS_KEY = 'inspectplus.cred.users';

interface SeedUser {
  email: string;
  username: string;
  password: string;
  fullName?: string;
  ts?: number;
}

async function seedCachedUser({ email, username, password, fullName = 'Jane Doe', ts = Date.now() }: SeedUser) {
  const credHash = `hash(${email}:${password}:inspectplus)`;
  const existing = JSON.parse((await SecureStore.getItemAsync(CRED_USERS_KEY)) ?? '[]');
  existing.push({
    email,
    username,
    fullName,
    province: 'Ontario',
    municipalities: [],
    role: 'Inspector',
    credHash,
    session: { access_token: 'cached-access', refresh_token: 'cached-refresh', user: { id: 'uid-1' } },
    ts,
  });
  await SecureStore.setItemAsync(CRED_USERS_KEY, JSON.stringify(existing));
}

beforeEach(() => {
  secureStoreState.clear();
  jest.clearAllMocks();
  mockSupabase.auth.setSession.mockResolvedValue({ error: null });
});

describe('authService.signIn — offline fallback on connectivity failure (Bug 2)', () => {
  it('falls back to cached credentials when resolveEmail RPC fails due to connectivity, instead of surfacing "Username not found."', async () => {
    mockCheckOnline.mockResolvedValue(true); // device has network...
    await seedCachedUser({ email: 'jdoe@example.com', username: 'jdoe', password: 'correct-pw' });

    // ...but the backend itself is unreachable: the RPC call errors out.
    mockSupabase.rpc.mockReturnValue({
      abortSignal: () => Promise.resolve({ data: null, error: { message: 'network request failed' } }),
    });

    const result = await authService.signIn('jdoe', 'correct-pw');

    expect(result?.session).toBeDefined();
    expect(result?.fullName).toBe('Jane Doe');
    // Never even reached: proves it took the offline path, not a real login.
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('falls back to cached credentials when signInWithPassword fails with AuthRetryableFetchError (email login)', async () => {
    mockCheckOnline.mockResolvedValue(true);
    await seedCachedUser({ email: 'jdoe@example.com', username: 'jdoe', password: 'correct-pw' });

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: new AuthRetryableFetchError('fetch failed', 0),
    });

    const result = await authService.signIn('jdoe@example.com', 'correct-pw');

    expect(result?.session).toBeDefined();
    expect(result?.fullName).toBe('Jane Doe');
  });

  it('surfaces signInOffline\'s honest "no credentials" error when the device-online-but-backend-down fallback has nothing cached', async () => {
    mockCheckOnline.mockResolvedValue(true);
    mockSupabase.rpc.mockReturnValue({
      abortSignal: () => Promise.resolve({ data: null, error: { message: 'network request failed' } }),
    });

    await expect(authService.signIn('nobody', 'whatever')).rejects.toThrow(
      /No offline credentials stored/,
    );
  });

  it('does NOT fall back to offline for a non-connectivity failure (wrong password stays wrong password)', async () => {
    mockCheckOnline.mockResolvedValue(true);
    await seedCachedUser({ email: 'jdoe@example.com', username: 'jdoe', password: 'correct-pw' });

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Invalid login credentials'), { name: 'AuthApiError' }),
    });

    await expect(authService.signIn('jdoe@example.com', 'correct-pw')).rejects.toThrow(
      'Invalid login credentials',
    );
  });

  it('still throws the honest "Username not found." when the RPC succeeds but the username genuinely does not exist (no connectivity fallback)', async () => {
    mockCheckOnline.mockResolvedValue(true);
    mockSupabase.rpc.mockReturnValue({
      abortSignal: () => Promise.resolve({ data: null, error: null }),
    });

    await expect(authService.signIn('ghost', 'whatever')).rejects.toThrow('Username not found.');
  });
});

describe('authService.signIn — offline sign-in latency bound (Bug 1 follow-up)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not block on a live-session restore that never resolves (dead backend) — returns within SESSION_RESTORE_WAIT_MS, not ~30s', async () => {
    mockCheckOnline.mockResolvedValue(false);
    await seedCachedUser({ email: 'jdoe@example.com', username: 'jdoe', password: 'correct-pw' });

    // Simulate GoTrueClient's internal refresh-retry loop hanging far longer
    // than our wait cap (never resolves within the test).
    mockSupabase.auth.setSession.mockReturnValue(new Promise(() => {}));

    const signInPromise = authService.signIn('jdoe', 'correct-pw');
    let settled = false;
    signInPromise.then(() => {
      settled = true;
    });

    // Just under the wait cap: must NOT have resolved yet.
    await jest.advanceTimersByTimeAsync(4900);
    expect(settled).toBe(false);

    // Past the wait cap: must have resolved by now, without setSession ever finishing.
    await jest.advanceTimersByTimeAsync(200);
    const result = await signInPromise;
    expect(settled).toBe(true);
    expect(result?.session).toBeDefined();
  });

  it('resolves promptly when the live-session restore succeeds quickly (reachable backend)', async () => {
    mockCheckOnline.mockResolvedValue(false);
    await seedCachedUser({ email: 'jdoe@example.com', username: 'jdoe', password: 'correct-pw' });
    mockSupabase.auth.setSession.mockResolvedValue({ error: null });

    const result = await authService.signIn('jdoe', 'correct-pw');
    expect(result?.session).toBeDefined();
  });
});

describe('authService.signIn — offline credential mechanics', () => {
  it('rejects with "No offline credentials stored" on a device that has never cached anyone', async () => {
    mockCheckOnline.mockResolvedValue(false);
    await expect(authService.signIn('anyone', 'whatever')).rejects.toThrow(
      /No offline credentials stored/,
    );
  });

  it('rejects an unrecognized username on a device that has other cached users', async () => {
    mockCheckOnline.mockResolvedValue(false);
    await seedCachedUser({ email: 'jdoe@example.com', username: 'jdoe', password: 'correct-pw' });

    await expect(authService.signIn('someone-else', 'whatever')).rejects.toThrow(
      /Username not recognized for offline access/,
    );
  });

  it('rejects a wrong password for a cached user', async () => {
    mockCheckOnline.mockResolvedValue(false);
    await seedCachedUser({ email: 'jdoe@example.com', username: 'jdoe', password: 'correct-pw' });

    await expect(authService.signIn('jdoe', 'wrong-pw')).rejects.toThrow('Invalid credentials.');
  });

  it('is case-insensitive on username for offline lookup', async () => {
    mockCheckOnline.mockResolvedValue(false);
    await seedCachedUser({ email: 'jdoe@example.com', username: 'jdoe', password: 'correct-pw' });

    const result = await authService.signIn('JDoe', 'correct-pw');
    expect(result?.session).toBeDefined();
  });

  it('is case-insensitive on email for offline lookup', async () => {
    mockCheckOnline.mockResolvedValue(false);
    await seedCachedUser({ email: 'jdoe@example.com', username: 'jdoe', password: 'correct-pw' });

    const result = await authService.signIn('JDoe@Example.com', 'correct-pw');
    expect(result?.session).toBeDefined();
  });

  it('expires a single user\'s offline access independently of other cached users on the same device', async () => {
    mockCheckOnline.mockResolvedValue(false);
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    await seedCachedUser({
      email: 'expired@example.com',
      username: 'expired',
      password: 'pw',
      ts: Date.now() - oneWeekMs - 1000, // just past the window
    });
    await seedCachedUser({
      email: 'valid@example.com',
      username: 'valid',
      password: 'pw',
      ts: Date.now(),
    });

    await expect(authService.signIn('expired', 'pw')).rejects.toThrow(/Offline access has expired/);
    const result = await authService.signIn('valid', 'pw');
    expect(result?.session).toBeDefined();
  });

  it('purges an expired credential from the device after rejecting it, freeing the allocated session/password-hash storage', async () => {
    mockCheckOnline.mockResolvedValue(false);
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    await seedCachedUser({
      email: 'expired@example.com',
      username: 'expired',
      password: 'pw',
      ts: Date.now() - oneWeekMs - 1000,
    });

    await expect(authService.signIn('expired', 'pw')).rejects.toThrow(/Offline access has expired/);

    // The entry is now gone entirely — a second attempt, even with the
    // right password, reads as "device has no cache at all" (this was the
    // only cached user) rather than "expired", proving the stored
    // session/credHash were actually dropped and not just
    // rejected-but-retained.
    await expect(authService.signIn('expired', 'pw')).rejects.toThrow(
      /No offline credentials stored/,
    );

    const raw = await SecureStore.getItemAsync(CRED_USERS_KEY);
    expect(JSON.parse(raw ?? '[]')).toEqual([]);
  });

  it('sweeps an expired peer\'s credential when a different cached user successfully logs in offline', async () => {
    mockCheckOnline.mockResolvedValue(false);
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    await seedCachedUser({
      email: 'expired@example.com',
      username: 'expired',
      password: 'pw',
      ts: Date.now() - oneWeekMs - 1000,
    });
    await seedCachedUser({ email: 'valid@example.com', username: 'valid', password: 'pw', ts: Date.now() });

    // Signing in as the still-valid user is a different code path from the
    // expired user's own rejection — this confirms signInOffline's read of
    // the cache doesn't need the expired entry to be the one being tried
    // at all for it to eventually get cleaned up on this device.
    await expect(authService.signIn('expired', 'pw')).rejects.toThrow(/Offline access has expired/);
    const raw = await SecureStore.getItemAsync(CRED_USERS_KEY);
    const remaining = JSON.parse(raw ?? '[]') as { username: string }[];
    expect(remaining.map(u => u.username)).toEqual(['valid']);
  });
});

describe('authService.signIn — online happy path', () => {
  it('resolves profile and municipality lookups in parallel and returns them', async () => {
    mockCheckOnline.mockResolvedValue(true);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'uid-1' }, session: { access_token: 'a', refresh_token: 'b' } },
      error: null,
    });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_accounts') {
        return makeQueryBuilder({
          data: {
            username: 'jdoe',
            first_name: 'Jane',
            middle_name: null,
            last_name: 'Doe',
            province: 'Ontario',
            role: 'Inspector',
          },
          error: null,
        });
      }
      if (table === 'inspector_municipalities') {
        return makeQueryBuilder({ data: [{ municipality: 'Toronto' }, { municipality: 'Ottawa' }], error: null });
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await authService.signIn('jdoe@example.com', 'correct-pw');

    expect(result.fullName).toBe('Jane Doe');
    expect(result.province).toBe('Ontario');
    expect(result.municipalities).toEqual(['Ottawa', 'Toronto']);
    expect(result.role).toBe('Inspector');
  });

  it('sweeps any other expired cached credential when caching a fresh online sign-in', async () => {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    await seedCachedUser({
      email: 'expired@example.com',
      username: 'expired',
      password: 'pw',
      ts: Date.now() - oneWeekMs - 1000,
    });

    mockCheckOnline.mockResolvedValue(true);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'uid-1' }, session: { access_token: 'a', refresh_token: 'b' } },
      error: null,
    });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_accounts') {
        return makeQueryBuilder({
          data: {
            username: 'jdoe',
            first_name: 'Jane',
            middle_name: null,
            last_name: 'Doe',
            province: 'Ontario',
            role: 'Inspector',
          },
          error: null,
        });
      }
      if (table === 'inspector_municipalities') {
        return makeQueryBuilder({ data: [], error: null });
      }
      throw new Error(`unexpected table ${table}`);
    });

    await authService.signIn('jdoe@example.com', 'correct-pw');

    const raw = await SecureStore.getItemAsync(CRED_USERS_KEY);
    const remaining = JSON.parse(raw ?? '[]') as { username: string }[];
    expect(remaining.map(u => u.username)).toEqual(['jdoe']);
  });
});
