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
  '33333333-3333-3333-3333-333333333333',
  'Inspector C',
  'inspector_c_purpose_push',
  'hashed',
  'Inspector',
  'Region 4-B',
  'Occidental Mindoro',
  true,
  'pending',
  'device-c'
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
  'est-purpose-001',
  '33333333-3333-3333-3333-333333333333',
  'Purpose Plant',
  'Purpose Address',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now(),
  now(),
  'pending',
  'device-c'
);

insert into public.inspection_reports (
  report_id,
  estab_id,
  inspector_uid,
  report_type,
  report_control_number,
  inspection_date,
  snapshot,
  permits_snapshot,
  created_at,
  updated_at,
  is_archived,
  sync_status,
  device_id
) values (
  'rep-purpose-001',
  'est-purpose-001',
  '33333333-3333-3333-3333-333333333333',
  'air_monitoring',
  'CTRL-PURPOSE-001',
  current_date,
  '{"name":"Purpose Plant"}'::jsonb,
  '{"ecc_no":"ECC-001"}'::jsonb,
  now(),
  now(),
  false,
  'pending',
  'device-c'
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
            "report_id": "rep-purpose-001",
            "determine_compliance": true,
            "application_type": "PTO Air"
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
            "report_id": "rep-purpose-001",
            "determine_compliance": false,
            "application_type": "HazWaste ID"
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

select * from finish();

rollback;