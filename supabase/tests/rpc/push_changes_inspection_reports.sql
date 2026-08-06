begin;

select plan(8);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '22222222-2222-2222-2222-222222222222',
  'Inspector', 'B', 'inspector_b_report_push', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_b_report_push@test.local',
  true, 'pending', 'device-b'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-report-001', '22222222-2222-2222-2222-222222222222', 'Report Plant',
  'Report Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000007', 'report-plant@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-b'
);

insert into public.purpose_of_inspection (
  purpose_id, estab_id, inspector_uid, inspection_date, device_id
) values (
  'purpose-report-001', 'est-report-001', '22222222-2222-2222-2222-222222222222',
  current_date, 'device-b'
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
      "purpose_of_inspection": {
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
            "purpose_id": "purpose-report-001",
            "report_type": "air_monitoring",
            "report_control_no": "CTRL-001",
            "inspection_date": "2026-04-29",
            "establishment_snapshot": {"name":"Report Plant"},
            "permits_snapshot": [{"envi_law":"RA 8749","permit_type":"PTO","permit_serial":"ECC-001","issued_date":"2024-01-01","expiry_date":"2025-01-01"}],
            "is_archived": false,
            "sync_status": "pending",
            "device_id": "device-b"
          }
        ],
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

select is(
  (
    select report_status
    from public.inspection_reports
    where report_id = 'rep-push-001'
  ),
  'draft',
  'push_changes defaults report_status to draft when omitted'
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
      "purpose_of_inspection": {
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
            "purpose_id": "purpose-report-001",
            "report_type": "water_monitoring",
            "report_control_no": "CTRL-002",
            "inspection_date": "2026-04-29",
            "establishment_snapshot": {"name":"Updated Report Plant"},
            "permits_snapshot": [{"envi_law":"RA 9275","permit_type":"DP","permit_serial":"DP-002","issued_date":"2024-01-01","expiry_date":"2025-01-01"}],
            "is_archived": true,
            "sync_status": "pending",
            "device_id": "device-b",
            "report_status": "submitted"
          }
        ],
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
    select report_control_no
    from public.inspection_reports
    where report_id = 'rep-push-001'
  ),
  'CTRL-002',
  'push_changes updates an existing inspection report row'
);

select is(
  (
    select report_status
    from public.inspection_reports
    where report_id = 'rep-push-001'
  ),
  'submitted',
  'push_changes updates report_status to submitted'
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
      "purpose_of_inspection": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": [],
        "updated": [],
        "deleted": ["rep-push-001"]
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
