begin;

select plan(2);

insert into public.user_accounts (
  uid,
  full_name,
  username,
  password_hash,
  role,
  region,
  area_of_assignment,
  is_active,
  sync_status,
  device_id
) values (
  '55555555-5555-5555-5555-555555555555',
  'Inspector E',
  'inspector_e_air',
  'hashed',
  'Inspector',
  'Region 4-B',
  'Occidental Mindoro',
  true,
  'pending',
  'device-e'
);

insert into public.establishments (
  estab_id,
  inspector_uid,
  name,
  address,
  province,
  nature_of_business,
  status,
  created_at,
  updated_at,
  sync_status,
  device_id
) values (
  'est-air-a',
  '55555555-5555-5555-5555-555555555555',
  'Plant Air A',
  'Address A',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now() - interval '1 minute',
  now() - interval '1 minute',
  'pending',
  'device-e'
);

insert into public.inspection_reports (
  report_id,
  estab_id,
  inspector_uid,
  report_type,
  report_control_number,
  inspection_date,
  snapshot,
  permits_snapshot,
  created_at,
  updated_at,
  is_archived,
  sync_status,
  device_id
) values (
  'rep-air-a',
  'est-air-a',
  '55555555-5555-5555-5555-555555555555',
  'air_monitoring',
  'CTRL-AIR-001',
  current_date,
  '{"name":"Plant Air A"}'::jsonb,
  '{"ecc_no":"ECC-001"}'::jsonb,
  now() - interval '1 minute',
  now() - interval '1 minute',
  false,
  'pending',
  'device-e'
);

insert into public.compliance_air (
  compliance_id,
  report_id,
  other_observations,
  remarks_recommendations
) values (
  'air-a',
  'rep-air-a',
  'Initial observation',
  'Initial recommendation'
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'compliance_air'->'created'),
  1,
  'pull_changes returns one compliance_air row for initial sync'
);

select is(
  jsonb_array_length(
    public.pull_changes(
      floor(extract(epoch from now()) * 1000)::bigint
    )->'changes'->'compliance_air'->'created'
  ),
  0,
  'pull_changes returns no compliance_air rows for current timestamp'
);

select * from finish();

rollback;