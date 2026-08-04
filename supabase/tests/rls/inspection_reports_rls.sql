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
) values
  (
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
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Inspector B',
    'inspector_b',
    'hashed',
    'Inspector',
    'Region 4-B',
    'Oriental Mindoro',
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
) values
  (
    'est-ir-a',
    '11111111-1111-1111-1111-111111111111',
    'Plant A',
    'Address A',
    'Occidental Mindoro',
    'Manufacturing',
    'Active',
    now(),
    now(),
    'pending',
    'device-a'
  ),
  (
    'est-ir-b',
    '22222222-2222-2222-2222-222222222222',
    'Plant B',
    'Address B',
    'Oriental Mindoro',
    'Processing',
    'Active',
    now(),
    now(),
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
) values
  (
    'rep-rls-a',
    'est-ir-a',
    '11111111-1111-1111-1111-111111111111',
    'air_monitoring',
    'CTRL-RLS-A',
    current_date,
    '{"name":"Plant A"}'::jsonb,
    '{"ecc_no":"ECC-A"}'::jsonb,
    now(),
    now(),
    false,
    'pending',
    'device-a'
  ),
  (
    'rep-rls-b',
    'est-ir-b',
    '22222222-2222-2222-2222-222222222222',
    'water_monitoring',
    'CTRL-RLS-B',
    current_date,
    '{"name":"Plant B"}'::jsonb,
    '{"dp_no":"DP-B"}'::jsonb,
    now(),
    now(),
    false,
    'pending',
    'device-b'
  );

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (
    select count(*)::int
    from public.inspection_reports
    where report_id = 'rep-rls-a'
  ),
  1,
  'user A can read their own inspection report'
);

select is(
  (
    select count(*)::int
    from public.inspection_reports
    where report_id = 'rep-rls-b'
  ),
  0,
  'user A cannot read user B inspection report'
);

select * from finish();
rollback;