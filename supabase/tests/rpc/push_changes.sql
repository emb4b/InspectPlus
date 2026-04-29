begin;
select plan(8);

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
        "updated": [],
        "deleted": []
      },
      "inspection_reports": {
        "created": []
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
        "created": []
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

select is(
  public.push_changes(
    '{
      "establishments": {
        "created": [],
        "updated": [],
        "deleted": ["est-push-001"]
      },
      "inspection_reports": {
        "created": []
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

insert into public.establishments (
  estab_id, inspector_uid, name, address, province, nature_of_business, status, created_at, updated_at, sync_status, device_id
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
        ]
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

select * from finish();
rollback;