begin;
select plan(24);

insert into public.user_accounts (
  uid,
  full_name,
  username,
  password_hash,
  role,
  region,
  area_of_assignment,
  is_active,
  sync_status,
  device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector A',
  'inspector_a',
  'hashed',
  'Inspector',
  'Region 4-B',
  'Occidental Mindoro',
  true,
  'pending',
  'device-a'
);

-- Establishments: create
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [
          {
            "estab_id": "est-push-001",
            "inspector_uid": "11111111-1111-1111-1111-111111111111",
            "name": "Pushed Plant",
            "address": "Push Address",
            "province": "Occidental Mindoro",
            "nature_of_business": "Manufacturing",
            "status": "Active",
            "sync_status": "pending",
            "device_id": "device-a"
          }
        ],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for created establishments'
);

select is(
  (
    select count(*)::int
    from public.establishments
    where estab_id = 'est-push-001'
  ),
  1,
  'push_changes inserts one establishment row'
);

-- Establishments: update
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [
          {
            "estab_id": "est-push-001",
            "inspector_uid": "11111111-1111-1111-1111-111111111111",
            "name": "Updated Plant",
            "address": "Updated Address",
            "province": "Occidental Mindoro",
            "nature_of_business": "Manufacturing",
            "status": "Inactive",
            "sync_status": "pending",
            "device_id": "device-a"
          }
        ],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for updated establishments'
);

select is(
  (
    select name
    from public.establishments
    where estab_id = 'est-push-001'
  ),
  'Updated Plant',
  'push_changes updates an existing establishment row'
);

-- Establishments: delete
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": ["est-push-001"]
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted establishments'
);

select is(
  (
    select count(*)::int
    from public.establishments
    where estab_id = 'est-push-001'
  ),
  0,
  'push_changes deletes an existing establishment row'
);

-- Shared parent establishment for report tests
insert into public.establishments (
  estab_id,
  inspector_uid,
  name,
  address,
  province,
  nature_of_business,
  status,
  created_at,
  updated_at,
  sync_status,
  device_id
) values (
  'est-report-001',
  '11111111-1111-1111-1111-111111111111',
  'Report Plant',
  'Report Address',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now(),
  now(),
  'pending',
  'device-a'
);

-- Inspection reports: create
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [
          {
            "report_id": "rep-push-001",
            "estab_id": "est-report-001",
            "inspector_uid": "11111111-1111-1111-1111-111111111111",
            "report_type": "air_monitoring",
            "report_control_number": "CTRL-001",
            "inspection_date": "2026-04-29",
            "snapshot": {"name":"Report Plant"},
            "permits_snapshot": {"ecc_no":"ECC-001"},
            "is_archived": false,
            "sync_status": "pending",
            "device_id": "device-a"
          }
        ],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for created inspection reports'
);

select is(
  (
    select count(*)::int
    from public.inspection_reports
    where report_id = 'rep-push-001'
  ),
  1,
  'push_changes inserts one inspection report row'
);

-- Inspection reports: update
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [
          {
            "report_id": "rep-push-001",
            "estab_id": "est-report-001",
            "inspector_uid": "11111111-1111-1111-1111-111111111111",
            "report_type": "water_monitoring",
            "report_control_number": "CTRL-002",
            "inspection_date": "2026-04-29",
            "snapshot": {"name":"Updated Report Plant"},
            "permits_snapshot": {"ecc_no":"ECC-002"},
            "is_archived": true,
            "sync_status": "pending",
            "device_id": "device-a"
          }
        ],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for updated inspection reports'
);

select is(
  (
    select report_control_number
    from public.inspection_reports
    where report_id = 'rep-push-001'
  ),
  'CTRL-002',
  'push_changes updates an existing inspection report row'
);

-- Purpose of inspection: create
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [
          {
            "purpose_id": "purpose-push-001",
            "report_id": "rep-push-001",
            "determine_compliance": true,
            "application_type": "PTO Air"
          }
        ],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for created purpose_of_inspection rows'
);

select is(
  (
    select count(*)::int
    from public.purpose_of_inspection
    where purpose_id = 'purpose-push-001'
  ),
  1,
  'push_changes inserts one purpose_of_inspection row'
);

-- Purpose of inspection: update
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [
          {
            "purpose_id": "purpose-push-001",
            "report_id": "rep-push-001",
            "determine_compliance": false,
            "application_type": "HazWaste ID"
          }
        ],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for updated purpose_of_inspection rows'
);

select is(
  (
    select application_type
    from public.purpose_of_inspection
    where purpose_id = 'purpose-push-001'
  ),
  'HazWaste ID',
  'push_changes updates an existing purpose_of_inspection row'
);

-- Purpose of inspection: delete
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": ["purpose-push-001"]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted purpose_of_inspection rows'
);

select is(
  (
    select count(*)::int
    from public.purpose_of_inspection
    where purpose_id = 'purpose-push-001'
  ),
  0,
  'push_changes deletes an existing purpose_of_inspection row'
);

-- Inspection reports: delete
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": ["rep-push-001"]
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted inspection reports'
);

select is(
  (
    select count(*)::int
    from public.inspection_reports
    where report_id = 'rep-push-001'
  ),
  0,
  'push_changes deletes an existing inspection report row'
);

select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "survey_reports": {
        "created": [
          {
            "survey_id": "survey-push-001",
            "estab_id": "est-report-001",
            "inspector_uid": "11111111-1111-1111-1111-111111111111",
            "report_control_number": "SURV-001",
            "inspection_date": "2026-04-29",
            "project_name": "Survey Project",
            "proponent_name": "Survey Proponent",
            "project_location": "Survey Location",
            "purpose": "ECC Application",
            "sync_status": "pending",
            "device_id": "device-a"
          }
        ],
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

select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "survey_reports": {
        "created": [],
        "updated": [
          {
            "survey_id": "survey-push-001",
            "estab_id": "est-report-001",
            "inspector_uid": "11111111-1111-1111-1111-111111111111",
            "report_control_number": "SURV-002",
            "inspection_date": "2026-04-29",
            "project_name": "Updated Survey Project",
            "proponent_name": "Survey Proponent",
            "project_location": "Survey Location",
            "purpose": "ECC Amendment",
            "sync_status": "pending",
            "device_id": "device-a"
          }
        ],
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

select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "survey_reports": {
        "created": [],
        "updated": [],
        "deleted": ["survey-push-001"]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted survey_reports'
);

select is(
  (
    select count(*)::int
    from public.survey_reports
    where survey_id = 'survey-push-001'
  ),
  0,
  'push_changes deletes an existing survey_report row'
);

select * from finish();
rollback;