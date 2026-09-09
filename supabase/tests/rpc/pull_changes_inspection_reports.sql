begin;

select plan(2);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '22222222-2222-2222-2222-222222222222',
  'Inspector', 'B', 'inspector_b_report', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_b_report@test.local',
  true, 'pending', 'device-b'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-report-a', '22222222-2222-2222-2222-222222222222', 'Plant Report A',
  'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000005', 'plant-report-a@test.local', 'Contact A', 'Manager',
  now() - interval '1 minute', now() - interval '1 minute', 'pending', 'device-b'
);

insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, device_id
) values (
  'purpose-report-a', 'est-report-a', '22222222-2222-2222-2222-222222222222',
  current_date, 'device-b'
);

insert into public.inspection_reports (
  report_id, estab_id, inspector_uid, purpose_id, report_type, report_control_no,
  inspection_date, establishment_snapshot, permits_snapshot,
  created_at, updated_at, is_archived, sync_status, device_id
) values (
  'rep-a', 'est-report-a', '22222222-2222-2222-2222-222222222222', 'purpose-report-a',
  'air_monitoring', 'CTRL-001', current_date,
  '{"name":"Plant Report A"}'::jsonb,
  '[{"envi_law":"RA 8749","permit_type":"PTO","permit_serial":"ECC-001","issued_date":"2024-01-01","expiry_date":"2025-01-01"}]'::jsonb,
  now() - interval '1 minute', now() - interval '1 minute', false, 'pending', 'device-b'
);

-- Scoped to this test's own fixture row rather than the length of the whole
-- array: pull_changes returns everything visible to the caller, so counting
-- the entire payload silently asserted that the database is empty apart from
-- this file. That holds in CI (which resets before running) but breaks against
-- any database with real rows in it, and the failure looks like a bug in
-- pull_changes rather than in the test.
select is(
  (
    select count(*)::int
    from jsonb_array_elements(
      public.pull_changes(0)->'changes'->'inspection_reports'->'created'
    ) as pulled
    where pulled->>'report_id' = 'rep-a'
  ),
  1,
  'pull_changes returns this inspection report row for initial sync'
);

select is(
  (
    select count(*)::int
    from jsonb_array_elements(
      public.pull_changes(
        floor(extract(epoch from now()) * 1000)::bigint
      )->'changes'->'inspection_reports'->'created'
    ) as pulled
    where pulled->>'report_id' = 'rep-a'
  ),
  0,
  'pull_changes does not return this inspection report row for current timestamp'
);

select * from finish();

rollback;
