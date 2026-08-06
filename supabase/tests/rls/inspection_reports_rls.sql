begin;
select plan(2);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Inspector', 'A', 'inspector_a', 'hashed', 'Inspector',
    'Region 4-B', 'Occidental Mindoro', 'inspector_a_ir_rls@test.local',
    true, 'pending', 'device-a'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Inspector', 'B', 'inspector_b', 'hashed', 'Inspector',
    'Region 4-B', 'Oriental Mindoro', 'inspector_b_ir_rls@test.local',
    true, 'pending', 'device-b'
  );

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values
  (
    'est-ir-a', '11111111-1111-1111-1111-111111111111', 'Plant A',
    'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
    'Manufacturing', 'Operational', 'Owner A', 'Head A',
    '09170000001', 'plant-ir-a@test.local', 'Contact A', 'Manager',
    now(), now(), 'pending', 'device-a'
  ),
  (
    'est-ir-b', '22222222-2222-2222-2222-222222222222', 'Plant B',
    'Address B', 'Barangay B', 'City B', 'Oriental Mindoro',
    'Processing', 'Operational', 'Owner B', 'Head B',
    '09170000002', 'plant-ir-b@test.local', 'Contact B', 'Manager',
    now(), now(), 'pending', 'device-b'
  );

insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, device_id
) values
  ('purpose-ir-a', 'est-ir-a', '11111111-1111-1111-1111-111111111111', current_date, 'device-a'),
  ('purpose-ir-b', 'est-ir-b', '22222222-2222-2222-2222-222222222222', current_date, 'device-b');

insert into public.inspection_reports (
  report_id, estab_id, inspector_uid, purpose_id, report_type, report_control_no,
  inspection_date, establishment_snapshot, permits_snapshot,
  created_at, updated_at, is_archived, sync_status, device_id
) values
  (
    'rep-rls-a', 'est-ir-a', '11111111-1111-1111-1111-111111111111', 'purpose-ir-a',
    'air_monitoring', 'CTRL-RLS-A', current_date,
    '{"name":"Plant A"}'::jsonb, '[]'::jsonb,
    now(), now(), false, 'pending', 'device-a'
  ),
  (
    'rep-rls-b', 'est-ir-b', '22222222-2222-2222-2222-222222222222', 'purpose-ir-b',
    'water_monitoring', 'CTRL-RLS-B', current_date,
    '{"name":"Plant B"}'::jsonb, '[]'::jsonb,
    now(), now(), false, 'pending', 'device-b'
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
