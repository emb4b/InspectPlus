import { envConfig as devConfig }     from './env.dev';
import { envConfig as stagingConfig } from './env.staging';
import { envConfig as prodConfig }    from './env.prod';

const appEnv = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as
  | 'development'
  | 'staging'
  | 'production';

const configMap = {
  development: devConfig,
  staging:     stagingConfig,
  production:  prodConfig,
};

const baseConfig = configMap[appEnv];

// Lets an env var (e.g. in .env) override a per-environment default without
// having to touch the TS files — falls back to the TS default when unset or
// not a valid number. An empty/whitespace-only value counts as unset: Number('')
// is 0, which would otherwise silently turn `FOO=` in a .env file into a zero
// threshold rather than the default.
function numberFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const ENV = {
  // Secrets from .env files
  supabaseUrl:    process.env.EXPO_PUBLIC_SUPABASE_URL    ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  appEnv,

  // Non-secret config from TS files, individually overridable via .env
  ...baseConfig,
  shortCacheMs:       numberFromEnv(process.env.EXPO_PUBLIC_SHORT_CACHE_MS,       baseConfig.shortCacheMs),
  credentialWindowMs: numberFromEnv(process.env.EXPO_PUBLIC_CREDENTIAL_WINDOW_MS, baseConfig.credentialWindowMs),
  syncIntervalMs:     numberFromEnv(process.env.EXPO_PUBLIC_SYNC_INTERVAL_MS,     baseConfig.syncIntervalMs),
  // Report urgency windows, in days since the inspection date. Tune per
  // deployment from .env without a rebuild of the TS defaults.
  dueSoonDays:        numberFromEnv(process.env.EXPO_PUBLIC_DUE_SOON_DAYS,        baseConfig.dueSoonDays),
  overdueDays:        numberFromEnv(process.env.EXPO_PUBLIC_OVERDUE_DAYS,         baseConfig.overdueDays),
};

// Export the type so other files can reference it
export type AppConfig = typeof ENV;