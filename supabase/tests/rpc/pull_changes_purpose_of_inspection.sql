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
  '33333333-3333-3333-3333-333333333333',
  'Inspector C',
  'inspector_c_purpose',
  'hashed',
  'Inspector',
  'Region 4-B',
  'Occidental Mindoro',
  true,
  'pending',
  'device-c'
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
  'est-purpose-a',
  '33333333-3333-3333-3333-333333333333',
  'Plant Purpose A',
  'Address A',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now() - interval '1 minute',
  now() - interval '1 minute',
  'pending',
  'device-c'
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
  'rep-purpose-a',
  'est-purpose-a',
  '33333333-3333-3333-3333-333333333333',
  'air_monitoring',
  'CTRL-PURPOSE-001',
  current_date,
  '{"name":"Plant Purpose A"}'::jsonb,
  '{"ecc_no":"ECC-001"}'::jsonb,
  now() - interval '1 minute',
  now() - interval '1 minute',
  false,
  'pending',
  'device-c'
);

insert into public.purpose_of_inspection (
  purpose_id,
  report_id,
  determine_compliance
) values (
  'purpose-a',
  'rep-purpose-a',
  true
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'purpose_of_inspection'->'created'),
  1,
  'pull_changes returns one purpose_of_inspection row for initial sync'
);

select is(
  jsonb_array_length(
    public.pull_changes(
      floor(extract(epoch from now()) * 1000)::bigint
    )->'changes'->'purpose_of_inspection'->'created'
  ),
  0,
  'pull_changes returns no purpose_of_inspection rows for current timestamp'
);

select * from finish();

rollback;