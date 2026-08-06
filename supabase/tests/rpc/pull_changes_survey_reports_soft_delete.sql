begin;
select plan(1);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector', 'A', 'inspector_a', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_a_surv_soft@test.local',
  true, 'pending', 'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-soft-surv-002', '11111111-1111-1111-1111-111111111111', 'Survey Plant 2',
  'Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000022', 'survey-plant-2@test.local', 'Contact A', 'Manager',
  now() - interval '1 minute', now() - interval '1 minute', 'pending', 'device-a'
);

insert into public.survey_reports (
  survey_id, estab_id, inspector_uid, report_control_number, inspection_date,
  project_name, proponent_name, project_location, purpose,
  created_at, updated_at, deleted_at, is_archived, sync_status, device_id
) values (
  'survey-soft-002',
  'est-soft-surv-002',
  '11111111-1111-1111-1111-111111111111',
  'SURV-SOFT-002',
  current_date,
  'Survey Project',
  'Proponent',
  'Location',
  'ECC Application',
  now() - interval '1 minute',
  now() - interval '1 minute',
  now() - interval '30 seconds',
  false,
  'pending',
  'device-a'
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'survey_reports'->'deleted'),
  1,
  'pull_changes returns one deleted survey_report id'
);

select * from finish();
rollback;
