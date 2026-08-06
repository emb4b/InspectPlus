begin;

select plan(6);

insert into public.user_accounts (
  uid, first_name, last_name, username, password_hash, role, region, province,
  email, is_active, sync_status, device_id
) values (
  '11111111-1111-1111-1111-111111111111',
  'Inspector', 'A', 'inspector_a_est_push', 'hashed', 'Inspector',
  'Region 4-B', 'Occidental Mindoro', 'inspector_a_est_push@test.local',
  true, 'pending', 'device-a'
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
            "address_line": "Push Address",
            "barangay": "Push Barangay",
            "city": "Push City",
            "province": "Occidental Mindoro",
            "nature_of_business": "Manufacturing",
            "operating_status": "Operational",
            "owner_name": "Push Owner",
            "managing_head_name": "Push Head",
            "phone_fax": "09170000099",
            "email": "push-plant@test.local",
            "contact_person_name": "Push Contact",
            "contact_person_position": "Manager",
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
            "address_line": "Updated Address",
            "barangay": "Push Barangay",
            "city": "Push City",
            "province": "Occidental Mindoro",
            "nature_of_business": "Manufacturing",
            "operating_status": "Non-Operational",
            "owner_name": "Push Owner",
            "managing_head_name": "Push Head",
            "phone_fax": "09170000099",
            "email": "push-plant@test.local",
            "contact_person_name": "Push Contact",
            "contact_person_position": "Manager",
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

select * from finish();

rollback;
