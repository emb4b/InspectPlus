// ENV resolves process.env at module load, so every case here re-imports the
// module under a freshly staged process.env via jest.isolateModules.
const loadEnv = (vars: Record<string, string | undefined>) => {
  const original = process.env;
  process.env = { ...original, ...vars };
  let ENV!: typeof import('./env').ENV;
  try {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would bind ENV once, before process.env is staged
      ENV = require('./env').ENV;
    });
  } finally {
    process.env = original;
  }
  return ENV;
};

describe('ENV urgency day thresholds', () => {
  it('falls back to the per-environment defaults when no env vars are set', () => {
    const ENV = loadEnv({ EXPO_PUBLIC_DUE_SOON_DAYS: undefined, EXPO_PUBLIC_OVERDUE_DAYS: undefined });
    expect(ENV.dueSoonDays).toBe(14);
    expect(ENV.overdueDays).toBe(30);
  });

  it('takes the due-soon and overdue day counts from .env when set', () => {
    const ENV = loadEnv({ EXPO_PUBLIC_DUE_SOON_DAYS: '7', EXPO_PUBLIC_OVERDUE_DAYS: '21' });
    expect(ENV.dueSoonDays).toBe(7);
    expect(ENV.overdueDays).toBe(21);
  });

  it('ignores a non-numeric override rather than producing NaN thresholds', () => {
    const ENV = loadEnv({ EXPO_PUBLIC_DUE_SOON_DAYS: 'soon', EXPO_PUBLIC_OVERDUE_DAYS: '' });
    expect(ENV.dueSoonDays).toBe(14);
    expect(ENV.overdueDays).toBe(30);
  });
});
