begin;
select plan(3);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, area_of_assignment,
  email, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector', 'A', 'inspector_a', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_a_surv_soft_push@test.local',
  true, 'pending', 'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-soft-surv-001', '11111111-1111-1111-1111-111111111111', 'Survey Plant',
  'Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000023', 'survey-plant-1@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-a'
);

insert into public.survey_reports (
  survey_id, estab_id, inspector_uid, report_control_number, inspection_date,
  project_name, proponent_name, project_location, purpose,
  created_at, updated_at, is_archived, sync_status, device_id
) values (
  'survey-soft-001',
  'est-soft-surv-001',
  '11111111-1111-1111-1111-111111111111',
  'SURV-SOFT-001',
  current_date,
  'Survey Project',
  'Proponent',
  'Location',
  'ECC Application',
  now(),
  now(),
  false,
  'pending',
  'device-a'
);

select is(
  public.push_changes(
    '{
      "survey_reports": {
        "created": [],
        "updated": [],
        "deleted": ["survey-soft-001"]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'soft delete returns ok for survey_reports'
);

select ok(
  (
    select deleted_at is not null
    from public.survey_reports
    where survey_id = 'survey-soft-001'
  ),
  'survey_report deleted_at is set'
);

select is(
  (
    select count(*)::int
    from public.survey_reports
    where survey_id = 'survey-soft-001'
  ),
  1,
  'survey_report row is retained after soft delete'
);

select * from finish();
rollback;
