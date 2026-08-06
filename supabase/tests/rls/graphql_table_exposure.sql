begin;

select plan(20);

-- anon should not directly SELECT sensitive tables

select is(
  has_table_privilege('anon', 'public.user_accounts', 'SELECT'),
  false,
  'anon cannot SELECT user_accounts'
);

select is(
  has_table_privilege('anon', 'public.establishments', 'SELECT'),
  false,
  'anon cannot SELECT establishments'
);

select is(
  has_table_privilege('anon', 'public.inspection_reports', 'SELECT'),
  false,
  'anon cannot SELECT inspection_reports'
);

select is(
  has_table_privilege('anon', 'public.purpose_of_inspection', 'SELECT'),
  false,
  'anon cannot SELECT purpose_of_inspection'
);

select is(
  has_table_privilege('anon', 'public.survey_reports', 'SELECT'),
  false,
  'anon cannot SELECT survey_reports'
);

select is(
  has_table_privilege('anon', 'public.compliance_air', 'SELECT'),
  false,
  'anon cannot SELECT compliance_air'
);

select is(
  has_table_privilege('anon', 'public.compliance_water', 'SELECT'),
  false,
  'anon cannot SELECT compliance_water'
);

select is(
  has_table_privilege('anon', 'public.compliance_hazwaste', 'SELECT'),
  false,
  'anon cannot SELECT compliance_hazwaste'
);

select is(
  has_table_privilege('anon', 'public.compliance_eia', 'SELECT'),
  false,
  'anon cannot SELECT compliance_eia'
);

-- authenticated access policy:
-- all synced tables are readable via direct SELECT with RLS enforced —
-- pull_changes/push_changes run as SECURITY INVOKER, so authenticated needs
-- a real table grant for the RPCs to work at all (see
-- 20260806010000_grant_authenticated_on_compliance_tables.sql for the
-- compliance_* tables specifically)

select is(
  has_table_privilege('authenticated', 'public.user_accounts', 'SELECT'),
  true,
  'authenticated can directly SELECT user_accounts subject to RLS'
);

select is(
  has_table_privilege('authenticated', 'public.establishments', 'SELECT'),
  true,
  'authenticated can directly SELECT establishments subject to RLS'
);

select is(
  has_table_privilege('authenticated', 'public.inspection_reports', 'SELECT'),
  true,
  'authenticated can directly SELECT inspection_reports subject to RLS'
);

select is(
  has_table_privilege('authenticated', 'public.purpose_of_inspection', 'SELECT'),
  true,
  'authenticated can directly SELECT purpose_of_inspection subject to RLS'
);

select is(
  has_table_privilege('authenticated', 'public.survey_reports', 'SELECT'),
  true,
  'authenticated can directly SELECT survey_reports subject to RLS'
);

select is(
  has_table_privilege('authenticated', 'public.compliance_air', 'SELECT'),
  true,
  'authenticated can directly SELECT compliance_air subject to RLS'
);

select is(
  has_table_privilege('authenticated', 'public.compliance_water', 'SELECT'),
  true,
  'authenticated can directly SELECT compliance_water subject to RLS'
);

select is(
  has_table_privilege('authenticated', 'public.compliance_hazwaste', 'SELECT'),
  true,
  'authenticated can directly SELECT compliance_hazwaste subject to RLS'
);

select is(
  has_table_privilege('authenticated', 'public.compliance_eia', 'SELECT'),
  true,
  'authenticated can directly SELECT compliance_eia subject to RLS'
);

select is(
  has_table_privilege('anon', 'public.inspector_municipalities', 'SELECT'),
  false,
  'anon cannot SELECT inspector_municipalities'
);

select is(
  has_table_privilege('authenticated', 'public.inspector_municipalities', 'SELECT'),
  true,
  'authenticated can directly SELECT inspector_municipalities subject to RLS'
);

select * from finish();

rollback;