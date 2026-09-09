import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '../../core/config/env';

// jest-expo's preset does not mock this third-party package, so it needs the
// mock the package itself ships. The `mock`-prefixed name is required for
// Jest to allow the hoisted factory to reference it.
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const STORAGE_KEY = 'inspectplus.config.urgency';

// The module holds its snapshot in module scope, so each test needs a fresh
// copy of it rather than one shared across the file.
const loadModule = () => {
  let mod!: typeof import('./urgencyConfig');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would share one snapshot across every test
    mod = require('./urgencyConfig');
  });
  return mod;
};

describe('urgencyConfig resolution', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('falls back to the build-time ENV defaults before anything is hydrated', () => {
    const { getUrgencyConfig } = loadModule();
    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
  });

  it('adopts a valid cached pair on hydration', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dueSoonDays: 7, overdueDays: 21 }));
    const { getUrgencyConfig, hydrateUrgencyConfig } = loadModule();

    await hydrateUrgencyConfig();

    expect(getUrgencyConfig()).toEqual({ dueSoonDays: 7, overdueDays: 21 });
  });

  it('keeps the ENV defaults when the cached value is not valid JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not json');
    const { getUrgencyConfig, hydrateUrgencyConfig } = loadModule();

    await hydrateUrgencyConfig();

    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
  });

  it('rejects a cached pair whose overdue window is not beyond the due-soon window', async () => {
    // This is the pair that matters most: overdue <= dueSoon makes the
    // 'due-soon' branch of getReportUrgency unreachable, so every flagged
    // report would jump straight to 'Overdue' with no warning state.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dueSoonDays: 30, overdueDays: 30 }));
    const { getUrgencyConfig, hydrateUrgencyConfig } = loadModule();

    await hydrateUrgencyConfig();

    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
  });
});

describe('isValidThresholds', () => {
  const { isValidThresholds } = loadModule();

  it.each([
    ['a normal pair', { dueSoonDays: 14, overdueDays: 30 }, true],
    ['an inverted pair', { dueSoonDays: 30, overdueDays: 14 }, false],
    ['an equal pair', { dueSoonDays: 20, overdueDays: 20 }, false],
    ['a fractional due-soon window', { dueSoonDays: 14.5, overdueDays: 30 }, false],
    ['a zero due-soon window', { dueSoonDays: 0, overdueDays: 30 }, false],
    ['a negative overdue window', { dueSoonDays: 14, overdueDays: -1 }, false],
    ['a NaN value', { dueSoonDays: Number.NaN, overdueDays: 30 }, false],
    ['an infinite value', { dueSoonDays: 14, overdueDays: Number.POSITIVE_INFINITY }, false],
  ])('returns %s -> %s', (_label, pair, expected) => {
    expect(isValidThresholds(pair)).toBe(expected);
  });
});

// app_config is read straight through PostgREST, the same out-of-band
// pattern appVersionGate.ts uses. `.in()` is the terminal call in that
// chain, so it is what resolves.
type ConfigRow = { key: string; value: string };

function fakeSupabase(result: {
  data: ConfigRow[] | null;
  error: { message: string } | null;
}): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        in: () => Promise.resolve(result),
      }),
    }),
  } as unknown as SupabaseClient;
}

function rejectingSupabase(): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        in: () => Promise.reject(new Error('network down')),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('refreshUrgencyConfig', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('adopts a valid remote pair and caches it for the next cold start', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(
      fakeSupabase({
        data: [
          { key: 'due_soon_days', value: '7' },
          { key: 'overdue_days', value: '21' },
        ],
        error: null,
      }),
    );

    expect(getUrgencyConfig()).toEqual({ dueSoonDays: 7, overdueDays: 21 });
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) as string)).toEqual({
      dueSoonDays: 7,
      overdueDays: 21,
    });
  });

  it('fills a key the response omits from the currently resolved value', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(
      fakeSupabase({ data: [{ key: 'due_soon_days', value: '9' }], error: null }),
    );

    expect(getUrgencyConfig()).toEqual({ dueSoonDays: 9, overdueDays: ENV.overdueDays });
  });

  it('keeps the current values when the read errors', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(fakeSupabase({ data: null, error: { message: 'permission denied' } }));

    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('discards an invalid pair whole rather than adopting half of it', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(
      fakeSupabase({
        data: [
          { key: 'due_soon_days', value: '40' },
          { key: 'overdue_days', value: '30' },
        ],
        error: null,
      }),
    );

    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('discards the whole pair when a present value does not parse, rather than adopting half of it', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await refreshUrgencyConfig(
      fakeSupabase({
        data: [
          { key: 'due_soon_days', value: 'soon' },
          { key: 'overdue_days', value: '21' },
        ],
        error: null,
      }),
    );

    expect(getUrgencyConfig()).toEqual({ dueSoonDays: ENV.dueSoonDays, overdueDays: ENV.overdueDays });
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // A sync run awaits this call, so a rejection here would break sync
  // entirely. This is where the spec's "a rejected refresh does not fail the
  // sync run" guarantee lives — the orchestrator relies on it rather than
  // wrapping the call in its own catch.
  it('never rejects, even when the query itself throws', async () => {
    const { getUrgencyConfig, refreshUrgencyConfig } = loadModule();

    await expect(refreshUrgencyConfig(rejectingSupabase())).resolves.toBeUndefined();
    expect(getUrgencyConfig()).toEqual({
      dueSoonDays: ENV.dueSoonDays,
      overdueDays: ENV.overdueDays,
    });
  });
});
