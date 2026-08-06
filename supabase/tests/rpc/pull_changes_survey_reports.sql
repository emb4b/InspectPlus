begin;

select plan(2);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '44444444-4444-4444-4444-444444444444',
  'Inspector', 'D', 'inspector_d_survey', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_d_survey@test.local',
  true, 'pending', 'device-d'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-survey-a', '44444444-4444-4444-4444-444444444444', 'Plant Survey A',
  'Address A', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000020', 'plant-survey-a@test.local', 'Contact A', 'Manager',
  now() - interval '1 minute', now() - interval '1 minute', 'pending', 'device-d'
);

insert into public.survey_reports (
  survey_id,
  estab_id,
  inspector_uid,
  report_control_number,
  inspection_date,
  project_name,
  proponent_name,
  project_location,
  purpose,
  created_at,
  updated_at,
  is_archived,
  sync_status,
  device_id
) values (
  'survey-a',
  'est-survey-a',
  '44444444-4444-4444-4444-444444444444',
  'SURV-001',
  current_date,
  'Test Survey Project',
  'Test Proponent',
  'Test Location',
  'ECC Application',
  now() - interval '1 minute',
  now() - interval '1 minute',
  false,
  'pending',
  'device-d'
);

select is(
  jsonb_array_length(public.pull_changes(0)->'changes'->'survey_reports'->'created'),
  1,
  'pull_changes returns one survey_report row for initial sync'
);

select is(
  jsonb_array_length(
    public.pull_changes(
      floor(extract(epoch from now()) * 1000)::bigint
    )->'changes'->'survey_reports'->'created'
  ),
  0,
  'pull_changes returns no survey_report rows for current timestamp'
);

select * from finish();

rollback;
