begin;
select plan(2);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector', 'A', 'inspector_a', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_a_surv_conflict@test.local',
  true, 'pending', 'device-a'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-conflict-surv-001', '11111111-1111-1111-1111-111111111111', 'Survey Conflict Plant',
  'Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000024', 'survey-conflict-plant@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-a'
);

insert into public.survey_reports (
  survey_id, estab_id, inspector_uid, report_control_number, inspection_date,
  project_name, proponent_name, project_location, purpose,
  created_at, updated_at, is_archived, sync_status, device_id
) values (
  'survey-conflict-001',
  'est-conflict-surv-001',
  '11111111-1111-1111-1111-111111111111',
  'SURV-NEW',
  current_date,
  'Newest Project Name',
  'Proponent',
  'Location',
  'ECC Application',
  now(),
  '2026-05-01T12:00:00Z'::timestamptz,
  false,
  'pending',
  'device-a'
);

select public.push_changes(
  '{
    "survey_reports": {
      "created": [],
      "updated": [
        {
          "survey_id": "survey-conflict-001",
          "estab_id": "est-conflict-surv-001",
          "inspector_uid": "11111111-1111-1111-1111-111111111111",
          "report_control_number": "SURV-OLD",
          "inspection_date": "2026-04-29",
          "project_name": "Old Project Name",
          "proponent_name": "Proponent",
          "project_location": "Location",
          "purpose": "ECC Amendment",
          "updated_at": "2026-04-01T12:00:00Z",
          "is_archived": false,
          "sync_status": "pending",
          "device_id": "device-a"
        }
      ],
      "deleted": []
    }
  }'::jsonb
) as push_result \gset

select is(
  (
    select report_control_number
    from public.survey_reports
    where survey_id = 'survey-conflict-001'
  ),
  'SURV-NEW',
  'stale survey_report update is ignored'
);

select is(
  :'push_result'::jsonb -> 'conflicts' -> 'survey_reports',
  '["survey-conflict-001"]'::jsonb,
  'push_changes reports the rejected row_id in conflicts.survey_reports'
);

select * from finish();
rollback;
