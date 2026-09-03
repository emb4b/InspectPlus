-- 20260816060000_create_app_config.sql added an RLS policy allowing
-- authenticated to SELECT app_config, but never granted the table-level
-- SELECT privilege the policy depends on — every read failed with
-- "permission denied for table app_config", which assertAppVersionSupported
-- silently swallows (fail-open), so the version gate never actually ran.

grant select on public.app_config to authenticated;
