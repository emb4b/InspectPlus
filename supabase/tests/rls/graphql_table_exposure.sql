begin;

select plan(18);

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

-- authenticated should not directly SELECT sensitive tables.
-- Access should go through RPCs / safe views instead.

select is(
  has_table_privilege('authenticated', 'public.user_accounts', 'SELECT'),
  false,
  'authenticated cannot directly SELECT user_accounts'
);

select is(
  has_table_privilege('authenticated', 'public.establishments', 'SELECT'),
  false,
  'authenticated cannot directly SELECT establishments'
);

select is(
  has_table_privilege('authenticated', 'public.inspection_reports', 'SELECT'),
  false,
  'authenticated cannot directly SELECT inspection_reports'
);

select is(
  has_table_privilege('authenticated', 'public.purpose_of_inspection', 'SELECT'),
  false,
  'authenticated cannot directly SELECT purpose_of_inspection'
);

select is(
  has_table_privilege('authenticated', 'public.survey_reports', 'SELECT'),
  false,
  'authenticated cannot directly SELECT survey_reports'
);

select is(
  has_table_privilege('authenticated', 'public.compliance_air', 'SELECT'),
  false,
  'authenticated cannot directly SELECT compliance_air'
);

select is(
  has_table_privilege('authenticated', 'public.compliance_water', 'SELECT'),
  false,
  'authenticated cannot directly SELECT compliance_water'
);

select is(
  has_table_privilege('authenticated', 'public.compliance_hazwaste', 'SELECT'),
  false,
  'authenticated cannot directly SELECT compliance_hazwaste'
);

select is(
  has_table_privilege('authenticated', 'public.compliance_eia', 'SELECT'),
  false,
  'authenticated cannot directly SELECT compliance_eia'
);

select * from finish();

rollback;