import Constants from 'expo-constants';
import { compareVersions, getCurrentAppVersion } from './version';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.5.0' } },
}));

describe('compareVersions', () => {
  it('treats equal versions as equal', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });

  it('compares segments numerically, not lexically', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
  });

  it('compares minor and patch segments', () => {
    expect(compareVersions('1.2.0', '1.3.0')).toBe(-1);
    expect(compareVersions('1.2.5', '1.2.1')).toBe(1);
  });

  it('treats missing trailing segments as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2', '1.2.1')).toBe(-1);
  });
});

describe('getCurrentAppVersion', () => {
  it('reads the version from expo-constants', () => {
    expect(getCurrentAppVersion()).toBe('2.5.0');
  });

  it('falls back to 0.0.0 when expoConfig is unavailable', () => {
    const original = Constants.expoConfig;
    // @ts-expect-error — simulating expoConfig being unavailable at runtime
    Constants.expoConfig = undefined;
    try {
      expect(getCurrentAppVersion()).toBe('0.0.0');
    } finally {
      Constants.expoConfig = original;
    }
  });
});
