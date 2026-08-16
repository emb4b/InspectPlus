import { SupabaseClient } from '@supabase/supabase-js';
import { compareVersions, getCurrentAppVersion } from '../../utils/version';

export class UpdateRequiredError extends Error {
  minVersion: string;

  constructor(minVersion: string) {
    super(`App update required — minimum supported version is ${minVersion}`);
    this.name = 'UpdateRequiredError';
    this.minVersion = minVersion;
  }
}

// app_config is read directly via PostgREST, the same out-of-band pattern
// already used for user_accounts — it's operator-controlled config, not a
// synced entity, so it has no place in pull_changes/push_changes.
export async function assertAppVersionSupported(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'min_supported_app_version')
    .single();

  // No row / a read error means there's nothing to enforce against — fail
  // open rather than blocking sync over a config table that hasn't been
  // seeded yet or is temporarily unreachable for an unrelated reason.
  if (error || !data) return;

  const minVersion = data.value as string;
  if (compareVersions(getCurrentAppVersion(), minVersion) < 0) {
    throw new UpdateRequiredError(minVersion);
  }
}
