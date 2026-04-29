begin;
select plan(5);

insert into public.user_accounts (
  uid, full_name, username, password_hash, role, region, area_of_assignment, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector A',
  'inspector_a',
  'hashed',
  'Inspector',
  'Region 4-B',
  'Occidental Mindoro',
  true,
  'pending',
  'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address, province, nature_of_business, status, created_at, updated_at, sync_status, device_id
) values (
  'est-a',
  '11111111-1111-1111-1111-111111111111',
  'Plant A',
  'Address A',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now() - interval '1 minute',
  now() - interval '1 minute',
  'pending',
  'device-a'
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
  'est-a',
  '11111111-1111-1111-1111-111111111111',
  'air_monitoring',
  'CTRL-001',
  current_date,
  '{"name":"Plant A"}'::jsonb,
  '{"ecc_no":"ECC-001"}'::jsonb,
  now() - interval '1 minute',
  now() - interval '1 minute',
  false,
  'pending',
  'device-a'
);

select ok(
  (public.pull_changes(0) ? 'changes'),
  'pull_changes returns changes key'
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'establishments'->'created'),
  1,
  'pull_changes returns one establishment row for initial sync'
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
    )->'changes'->'establishments'->'created'
  ),
  0,
  'pull_changes returns no establishment rows for current timestamp'
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