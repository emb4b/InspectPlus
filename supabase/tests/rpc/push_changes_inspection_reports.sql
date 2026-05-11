begin;

select plan(6);

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
  '22222222-2222-2222-2222-222222222222',
  'Inspector B',
  'inspector_b_report_push',
  'hashed',
  'Inspector',
  'Region 4-B',
  'Occidental Mindoro',
  true,
  'pending',
  'device-b'
);

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
  '22222222-2222-2222-2222-222222222222',
  'Report Plant',
  'Report Address',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now(),
  now(),
  'pending',
  'device-b'
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
            "inspector_uid": "22222222-2222-2222-2222-222222222222",
            "report_type": "air_monitoring",
            "report_control_number": "CTRL-001",
            "inspection_date": "2026-04-29",
            "snapshot": {"name":"Report Plant"},
            "permits_snapshot": {"ecc_no":"ECC-001"},
            "is_archived": false,
            "sync_status": "pending",
            "device_id": "device-b"
          }
        ],
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
            "inspector_uid": "22222222-2222-2222-2222-222222222222",
            "report_type": "water_monitoring",
            "report_control_number": "CTRL-002",
            "inspection_date": "2026-04-29",
            "snapshot": {"name":"Updated Report Plant"},
            "permits_snapshot": {"ecc_no":"ECC-002"},
            "is_archived": true,
            "sync_status": "pending",
            "device_id": "device-b"
          }
        ],
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
      },
      "survey_reports": {
        "created": [],
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
  'push_changes returns ok status for deleted inspection reports'
);

select ok(
  (
    select deleted_at is not null
    from public.inspection_reports
    where report_id = 'rep-push-001'
  ),
  'push_changes soft deletes an existing inspection report row'
);

select * from finish();

rollback;