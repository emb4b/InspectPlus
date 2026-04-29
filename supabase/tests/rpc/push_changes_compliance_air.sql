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
  '55555555-5555-5555-5555-555555555555',
  'Inspector E',
  'inspector_e_air_push',
  'hashed',
  'Inspector',
  'Region 4-B',
  'Occidental Mindoro',
  true,
  'pending',
  'device-e'
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
  'est-air-001',
  '55555555-5555-5555-5555-555555555555',
  'Air Plant',
  'Air Address',
  'Occidental Mindoro',
  'Manufacturing',
  'Active',
  now(),
  now(),
  'pending',
  'device-e'
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
  'rep-air-001',
  'est-air-001',
  '55555555-5555-5555-5555-555555555555',
  'air_monitoring',
  'CTRL-AIR-001',
  current_date,
  '{"name":"Air Plant"}'::jsonb,
  '{"ecc_no":"ECC-001"}'::jsonb,
  now(),
  now(),
  false,
  'pending',
  'device-e'
);

-- Compliance air: create
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
        "deleted": []
      },
      "compliance_air": {
        "created": [
          {
            "compliance_id": "air-push-001",
            "report_id": "rep-air-001",
            "other_observations": "Air observation",
            "remarks_recommendations": "Air recommendation"
          }
        ],
        "updated": [],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for created compliance_air rows'
);

select is(
  (
    select count(*)::int
    from public.compliance_air
    where compliance_id = 'air-push-001'
  ),
  1,
  'push_changes inserts one compliance_air row'
);

-- Compliance air: update
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
        "deleted": []
      },
      "compliance_air": {
        "created": [],
        "updated": [
          {
            "compliance_id": "air-push-001",
            "report_id": "rep-air-001",
            "other_observations": "Updated air observation",
            "remarks_recommendations": "Updated air recommendation"
          }
        ],
        "deleted": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for updated compliance_air rows'
);

select is(
  (
    select remarks_recommendations
    from public.compliance_air
    where compliance_id = 'air-push-001'
  ),
  'Updated air recommendation',
  'push_changes updates an existing compliance_air row'
);

-- Compliance air: delete
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
        "deleted": []
      },
      "compliance_air": {
        "created": [],
        "updated": [],
        "deleted": ["air-push-001"]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted compliance_air rows'
);

select is(
  (
    select count(*)::int
    from public.compliance_air
    where compliance_id = 'air-push-001'
  ),
  0,
  'push_changes deletes an existing compliance_air row'
);

select * from finish();

rollback;