begin;
select plan(6);

insert into public.user_accounts (
  uid, full_name, username, password_hash, role, region, area_of_assignment, is_active, sync_status, device_id
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
        "updated": []
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for created rows'
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
        ]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for updated rows'
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

select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": ["est-push-001"]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status for deleted rows'
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