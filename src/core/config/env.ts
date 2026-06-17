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

export const ENV = {
  // Secrets from .env files
  supabaseUrl:    process.env.EXPO_PUBLIC_SUPABASE_URL    ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  appEnv,

  // Non-secret config from TS files
  ...configMap[appEnv],
};

// Export the type so other files can reference it
export type AppConfig = typeof ENV;