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
  'est-hw-a',
  '11111111-1111-1111-1111-111111111111',
  'HazWaste Plant A',
  'HazWaste Address A',
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
  'rep-hw-a',
  'est-hw-a',
  '11111111-1111-1111-1111-111111111111',
  'hazardous_waste',
  'CTRL-HW-001',
  current_date,
  '{"name":"HazWaste Plant A"}'::jsonb,
  '{"hwid_no":"HWID-001"}'::jsonb,
  now() - interval '1 minute',
  now() - interval '1 minute',
  false,
  'pending',
  'device-a'
);

insert into public.compliance_hazwaste (
  compliance_id,
  report_id,
  hazwaste_generator_id,
  other_observations,
  remarks_recommendations
) values (
  'hw-a',
  'rep-hw-a',
  'HWG-001',
  'Initial hazwaste observation',
  'Initial hazwaste recommendation'
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'compliance_hazwaste'->'created'),
  1,
  'pull_changes returns one compliance_hazwaste row for initial sync'
);

select is(
  jsonb_array_length(
    public.pull_changes(
      floor(extract(epoch from now()) * 1000)::bigint
    )->'changes'->'compliance_hazwaste'->'created'
  ),
  0,
  'pull_changes returns no compliance_hazwaste rows for current timestamp'
);

select * from finish();
rollback;