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
  '22222222-2222-2222-2222-222222222222',
  'Inspector B',
  'inspector_b_report',
  'hashed',
  'Inspector',
  'Region 4-B',
  'Occidental Mindoro',
  true,
  'pending',
  'device-b'
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
  'est-report-a',
  '22222222-2222-2222-2222-222222222222',
  'Plant Report A',
  'Address A',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now() - interval '1 minute',
  now() - interval '1 minute',
  'pending',
  'device-b'
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
  'rep-a',
  'est-report-a',
  '22222222-2222-2222-2222-222222222222',
  'air_monitoring',
  'CTRL-001',
  current_date,
  '{"name":"Plant Report A"}'::jsonb,
  '{"ecc_no":"ECC-001"}'::jsonb,
  now() - interval '1 minute',
  now() - interval '1 minute',
  false,
  'pending',
  'device-b'
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'inspection_reports'->'created'),
  1,
  'pull_changes returns one inspection report row for initial sync'
);

select is(
  jsonb_array_length(
    public.pull_changes(
      floor(extract(epoch from now()) * 1000)::bigint
    )->'changes'->'inspection_reports'->'created'
  ),
  0,
  'pull_changes returns no inspection report rows for current timestamp'
);

select * from finish();

rollback;