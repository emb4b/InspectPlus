import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
