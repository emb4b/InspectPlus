begin;

select plan(6);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '44444444-4444-4444-4444-444444444444',
  'Inspector', 'D', 'inspector_d_survey_push', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_d_survey_push@test.local',
  true, 'pending', 'device-d'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-survey-001', '44444444-4444-4444-4444-444444444444', 'Survey Plant',
  'Survey Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000021', 'survey-plant@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-d'
);

-- Survey reports: create
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "survey_reports": {
        "created": [
          {
            "survey_id": "survey-push-001",
            "estab_id": "est-survey-001",
            "inspector_uid": "44444444-4444-4444-4444-444444444444",
            "report_control_number": "SURV-001",
            "inspection_date": "2026-04-29",
            "project_name": "Survey Project",
            "proponent_name": "Survey Proponent",
            "project_location": "Survey Location",
            "purpose": "ECC Application",
            "sync_status": "pending",
            "device_id": "device-d"
          }
        ],
        "updated": [],
        "deleted": []
      },
      "compliance_air": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for created survey_reports'
);

select is(
  (
    select count(*)::int
    from public.survey_reports
    where survey_id = 'survey-push-001'
  ),
  1,
  'push_changes inserts one survey_report row'
);

-- Survey reports: update
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "survey_reports": {
        "created": [],
        "updated": [
          {
            "survey_id": "survey-push-001",
            "estab_id": "est-survey-001",
            "inspector_uid": "44444444-4444-4444-4444-444444444444",
            "report_control_number": "SURV-002",
            "inspection_date": "2026-04-29",
            "project_name": "Updated Survey Project",
            "proponent_name": "Survey Proponent",
            "project_location": "Survey Location",
            "purpose": "ECC Amendment",
            "sync_status": "pending",
            "device_id": "device-d"
          }
        ],
        "deleted": []
      },
      "compliance_air": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for updated survey_reports'
);

select is(
  (
    select report_control_number
    from public.survey_reports
    where survey_id = 'survey-push-001'
  ),
  'SURV-002',
  'push_changes updates an existing survey_report row'
);

-- Survey reports: delete
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "survey_reports": {
        "created": [],
        "updated": [],
        "deleted": ["survey-push-001"]
      },
      "compliance_air": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted survey_reports'
);

select ok(
  (
    select deleted_at is not null
    from public.survey_reports
    where survey_id = 'survey-push-001'
  ),
  'push_changes soft deletes an existing survey_report row'
);

select * from finish();

rollback;
