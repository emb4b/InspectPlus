begin;
select plan(6);

-- Same three-inspector setup as jurisdiction_establishments_rls.sql: A owns
-- the establishment/purpose/report under test, C shares A's jurisdiction
-- (Occidental Mindoro), B does not (Oriental Mindoro).
insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Inspector', 'A', 'inspector_a_jur_ir', 'hashed', 'Inspector',
    'Region 4-B', 'Occidental Mindoro', 'inspector_a_jur_ir@test.local',
    true, 'pending', 'device-a'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Inspector', 'B', 'inspector_b_jur_ir', 'hashed', 'Inspector',
    'Region 4-B', 'Oriental Mindoro', 'inspector_b_jur_ir@test.local',
    true, 'pending', 'device-b'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Inspector', 'C', 'inspector_c_jur_ir', 'hashed', 'Inspector',
    'Region 4-B', 'Occidental Mindoro', 'inspector_c_jur_ir@test.local',
    true, 'pending', 'device-c'
  );

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'jur-est-ir-a', '11111111-1111-1111-1111-111111111111', 'Plant A',
  'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000001', 'jur-plant-ir-a@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-a'
);

insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, device_id
) values (
  'jur-purpose-a', 'jur-est-ir-a', '11111111-1111-1111-1111-111111111111', current_date, 'device-a'
);

insert into public.inspection_reports (
  report_id, estab_id, inspector_uid, purpose_id, report_type, report_control_no,
  inspection_date, establishment_snapshot, permits_snapshot,
  created_at, updated_at, is_archived, sync_status, device_id
) values (
  'jur-rep-a', 'jur-est-ir-a', '11111111-1111-1111-1111-111111111111', 'jur-purpose-a',
  'air_monitoring', 'CTRL-JUR-A', current_date,
  '{"name":"Plant A"}'::jsonb, '[]'::jsonb,
  now(), now(), false, 'pending', 'device-a'
);

-- Inspector C: same jurisdiction as A, not the owner.
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select is(
  (select count(*)::int from public.inspection_reports where report_id = 'jur-rep-a'),
  1,
  'inspector in the same jurisdiction can read another inspector''s inspection report'
);

select is(
  (select count(*)::int from public.purpose_of_inspection where purpose_id = 'jur-purpose-a'),
  1,
  'inspector in the same jurisdiction can read the report''s purpose_of_inspection row'
);

update public.inspection_reports set report_control_no = 'HACKED' where report_id = 'jur-rep-a';
select is(
  (select report_control_no from public.inspection_reports where report_id = 'jur-rep-a'),
  'CTRL-JUR-A',
  'jurisdiction read access does not grant update rights on the report to a non-owner'
);

delete from public.inspection_reports where report_id = 'jur-rep-a';
select is(
  (select count(*)::int from public.inspection_reports where report_id = 'jur-rep-a'),
  1,
  'jurisdiction read access does not grant delete rights on the report to a non-owner'
);

-- Inspector B: different jurisdiction, not the owner.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select is(
  (select count(*)::int from public.inspection_reports where report_id = 'jur-rep-a'),
  0,
  'inspector in a different jurisdiction cannot read the inspection report'
);

select is(
  (select count(*)::int from public.purpose_of_inspection where purpose_id = 'jur-purpose-a'),
  0,
  'inspector in a different jurisdiction cannot read the purpose_of_inspection row'
);

select * from finish();
rollback;
