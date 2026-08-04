begin;

select plan(6);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, area_of_assignment,
  email, is_active, sync_status, device_id
) values (
  '33333333-3333-3333-3333-333333333333',
  'Inspector', 'C', 'inspector_c_purpose_push', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_c_purpose_push@test.local',
  true, 'pending', 'device-c'
);

insert into public.establishments (
  estab_id, inspector_uid, name, address_line, barangay, city, province,
  nature_of_business, operating_status, owner_name, managing_head_name,
  phone_fax, email, contact_person_name, contact_person_position,
  created_at, updated_at, sync_status, device_id
) values (
  'est-purpose-001', '33333333-3333-3333-3333-333333333333', 'Purpose Plant',
  'Purpose Address', 'Barangay A', 'City A', 'Occidental Mindoro',
  'Manufacturing', 'Operational', 'Owner A', 'Head A',
  '09170000004', 'purpose-plant@test.local', 'Contact A', 'Manager',
  now(), now(), 'pending', 'device-c'
);

-- Purpose of inspection: create (no report needed — purpose_of_inspection no
-- longer depends on inspection_reports; it's the other way around now)
select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": []
      },
      "purpose_of_inspection": {
        "created": [
          {
            "purpose_id": "purpose-push-001",
            "estab_id": "est-purpose-001",
            "inspector_uid": "33333333-3333-3333-3333-333333333333",
            "inspection_date": "2026-04-29",
            "determine_compliance": true,
            "sync_status": "pending",
            "device_id": "device-c"
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
      "purpose_of_inspection": {
        "created": [],
        "updated": [
          {
            "purpose_id": "purpose-push-001",
            "estab_id": "est-purpose-001",
            "inspector_uid": "33333333-3333-3333-3333-333333333333",
            "inspection_date": "2026-04-29",
            "determine_compliance": false,
            "investigate_complaints": true,
            "sync_status": "pending",
            "device_id": "device-c"
          }
        ],
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
    select investigate_complaints
    from public.purpose_of_inspection
    where purpose_id = 'purpose-push-001'
  ),
  true,
  'push_changes updates an existing purpose_of_inspection row'
);

-- Purpose of inspection: delete (hard delete)
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
        "deleted": ["purpose-push-001"]
      },
      "inspection_reports": {
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
