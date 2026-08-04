begin;
select plan(1);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, area_of_assignment,
  email, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector', 'A', 'inspector_a', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_a_ir_soft@test.local',
  true, 'pending', 'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-soft-ir-002', '11111111-1111-1111-1111-111111111111', 'Soft Delete Plant 2',
  'Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000006', 'soft-delete-plant-2@test.local', 'Contact A', 'Manager',
  now() - interval '1 minute', now() - interval '1 minute', 'pending', 'device-a'
);

insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, device_id
) values (
  'purpose-soft-ir-002', 'est-soft-ir-002', '11111111-1111-1111-1111-111111111111',
  current_date, 'device-a'
);

insert into public.inspection_reports (
  report_id, estab_id, inspector_uid, purpose_id, report_type, report_control_no,
  inspection_date, establishment_snapshot, permits_snapshot, created_at, updated_at,
  deleted_at, is_archived, sync_status, device_id
) values (
  'rep-soft-002', 'est-soft-ir-002', '11111111-1111-1111-1111-111111111111', 'purpose-soft-ir-002',
  'air_monitoring', 'CTRL-SOFT-002', current_date,
  '{"name":"Soft Delete Plant 2"}'::jsonb, '[]'::jsonb,
  now() - interval '1 minute', now() - interval '1 minute',
  now() - interval '30 seconds', false, 'pending', 'device-a'
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'inspection_reports'->'deleted'),
  1,
  'pull_changes returns one deleted inspection_report id'
);

select * from finish();
rollback;
