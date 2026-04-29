begin;
select plan(2);

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
        ]
      }
    }'::jsonb
  )->>'status',
  'ok',
  'push_changes returns ok status'
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

select * from finish();
rollback;