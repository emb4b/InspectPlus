begin;
select plan(9);

-- Inspector A owns everything under test, in Occidental Mindoro. Admin and
-- Developer accounts are both assigned to a DIFFERENT province (Romblon) —
-- proving their visibility comes from role, not a jurisdiction match.
insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Inspector', 'A', 'inspector_a_admin_rls', 'hashed', 'Inspector',
    'Region 4-B', 'Occidental Mindoro', 'inspector_a_admin_rls@test.local',
    true, 'pending', 'device-a'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Admin', 'User', 'admin_admin_rls', 'hashed', 'Administrator',
    'Region 4-B', 'Romblon', 'admin_admin_rls@test.local',
    true, 'pending', 'device-admin'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Dev', 'User', 'dev_admin_rls', 'hashed', 'Developer',
    'Region 4-B', 'Romblon', 'dev_admin_rls@test.local',
    true, 'pending', 'device-dev'
  );

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'admin-est-a', '11111111-1111-1111-1111-111111111111', 'Plant A',
  'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000001', 'admin-plant-a@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-a'
);

insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, device_id
) values (
  'admin-purpose-a', 'admin-est-a', '11111111-1111-1111-1111-111111111111', current_date, 'device-a'
);

insert into public.inspection_reports (
  report_id, estab_id, inspector_uid, purpose_id, report_type, report_control_no,
  inspection_date, establishment_snapshot, permits_snapshot,
  created_at, updated_at, is_archived, sync_status, device_id
) values (
  'admin-rep-a', 'admin-est-a', '11111111-1111-1111-1111-111111111111', 'admin-purpose-a',
  'air_monitoring', 'CTRL-ADMIN-A', current_date,
  '{"name":"Plant A"}'::jsonb, '[]'::jsonb,
  now(), now(), false, 'pending', 'device-a'
);

-- Administrator: different province, not the owner.
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);

select is(
  (select count(*)::int from public.establishments where estab_id = 'admin-est-a'),
  1,
  'administrator can read an establishment outside their own province'
);

select is(
  (select count(*)::int from public.inspection_reports where report_id = 'admin-rep-a'),
  1,
  'administrator can read an inspection report outside their own province'
);

select is(
  (select count(*)::int from public.purpose_of_inspection where purpose_id = 'admin-purpose-a'),
  1,
  'administrator can read a purpose_of_inspection row outside their own province'
);

update public.establishments set name = 'Hacked' where estab_id = 'admin-est-a';
select is(
  (select name from public.establishments where estab_id = 'admin-est-a'),
  'Plant A',
  'administrator full-read visibility does not grant update rights on an establishment they don''t own'
);

update public.inspection_reports set report_control_no = 'HACKED' where report_id = 'admin-rep-a';
select is(
  (select report_control_no from public.inspection_reports where report_id = 'admin-rep-a'),
  'CTRL-ADMIN-A',
  'administrator full-read visibility does not grant update rights on a report they don''t own'
);

delete from public.inspection_reports where report_id = 'admin-rep-a';
select is(
  (select count(*)::int from public.inspection_reports where report_id = 'admin-rep-a'),
  1,
  'administrator full-read visibility does not grant delete rights on a report they don''t own'
);

-- Developer: same check, different account.
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

select is(
  (select count(*)::int from public.establishments where estab_id = 'admin-est-a'),
  1,
  'developer can read an establishment outside their own province'
);

select is(
  (select count(*)::int from public.inspection_reports where report_id = 'admin-rep-a'),
  1,
  'developer can read an inspection report outside their own province'
);

delete from public.establishments where estab_id = 'admin-est-a';
select is(
  (select count(*)::int from public.establishments where estab_id = 'admin-est-a'),
  1,
  'developer full-read visibility does not grant delete rights on an establishment they don''t own'
);

select * from finish();
rollback;
