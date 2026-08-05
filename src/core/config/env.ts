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
// not a valid number.
function msFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
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
  shortCacheMs:       msFromEnv(process.env.EXPO_PUBLIC_SHORT_CACHE_MS,       baseConfig.shortCacheMs),
  credentialWindowMs: msFromEnv(process.env.EXPO_PUBLIC_CREDENTIAL_WINDOW_MS, baseConfig.credentialWindowMs),
  syncIntervalMs:     msFromEnv(process.env.EXPO_PUBLIC_SYNC_INTERVAL_MS,     baseConfig.syncIntervalMs),
};

// Export the type so other files can reference it
export type AppConfig = typeof ENV;